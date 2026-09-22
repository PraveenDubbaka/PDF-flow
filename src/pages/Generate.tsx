import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
 CheckSquare, 
 Table, 
 FileText, 
 StickyNote,
 Shuffle,
 ArrowLeft,
 Sparkles,
 Calculator,
 Mail,
 FileEdit
} from 'lucide-react';
import { ChecklistIcon } from '@/components/icons/ChecklistIcon';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ContentType as SidebarContentType } from '@/components/Sidebar';
import { GenerationPreview } from '@/components/GenerationPreview';
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from '@/lib/safeJson';

type ContentType = 'checklist' | 'worksheet' | 'letter' | 'note';
type DetailLevel = 'standard' | 'detailed';
type GenerationPhase = 'prompt' | 'preview';

// Map sidebar content types to generate page types
const sidebarToGenerateType: Record<SidebarContentType, ContentType> = {
 checklists: 'checklist',
 reports: 'worksheet',
 letters: 'letter',
 notes: 'note',
};

const contentTypeLabels: Record<ContentType, string> = {
 checklist: 'Checklist',
 worksheet: 'Report',
 letter: 'Letter',
 note: 'Notes to Financial Statements',
};

interface ExamplePrompt {
 icon: React.ReactNode;
 iconBg: string;
 text: string;
}

const promptsByType: Record<ContentType, ExamplePrompt[]> = {
 checklist: [
 {
 icon: <ChecklistIcon className="h-5 w-5" />,
 iconBg: 'bg-primary/10',
 text: 'Generate a full Independence checklist for a compilation engagement under CSRS 4200'
 },
 {
 icon: <CheckSquare className="h-5 w-5 text-emerald-600" />,
 iconBg: 'bg-emerald-100',
 text: 'Create a client acceptance and continuance checklist for audit engagements'
 },
 {
 icon: <FileText className="h-5 w-5 text-blue-600" />,
 iconBg: 'bg-blue-100',
 text: 'Build a year-end financial statement disclosure checklist'
 },
 {
 icon: <CheckSquare className="h-5 w-5 text-amber-600" />,
 iconBg: 'bg-amber-100',
 text: 'Generate a tax filing preparation checklist for corporate returns'
 },
 {
 icon: <FileText className="h-5 w-5 text-rose-600" />,
 iconBg: 'bg-rose-100',
 text: 'Create an internal controls assessment checklist for SOX compliance'
 },
 {
 icon: <ChecklistIcon className="h-5 w-5" />,
 iconBg: 'bg-cyan-100',
 text: 'Generate a Client Meeting Checklist with fields for client name, client position, and meeting date'
 },
 ],
 worksheet: [
 {
 icon: <Calculator className="h-5 w-5 text-primary" />,
 iconBg: 'bg-primary/10',
 text: 'Generate a materiality calculation worksheet for audit planning'
 },
 {
 icon: <Table className="h-5 w-5 text-emerald-600" />,
 iconBg: 'bg-emerald-100',
 text: 'Create a depreciation worksheet with adjustable assumptions'
 },
 {
 icon: <Calculator className="h-5 w-5 text-blue-600" />,
 iconBg: 'bg-blue-100',
 text: 'Build a loan amortization worksheet with monthly breakdown'
 },
 {
 icon: <Table className="h-5 w-5 text-violet-600" />,
 iconBg: 'bg-violet-100',
 text: 'Create a working trial balance worksheet with adjustments'
 },
 {
 icon: <Calculator className="h-5 w-5 text-amber-600" />,
 iconBg: 'bg-amber-100',
 text: 'Generate a revenue recognition analysis worksheet'
 },
 {
 icon: <Table className="h-5 w-5 text-rose-600" />,
 iconBg: 'bg-rose-100',
 text: 'Build a bank reconciliation worksheet template'
 },
 ],
 letter: [
 {
 icon: <Mail className="h-5 w-5 text-primary" />,
 iconBg: 'bg-primary/10',
 text: 'Generate an engagement letter for a compilation engagement'
 },
 {
 icon: <FileEdit className="h-5 w-5 text-emerald-600" />,
 iconBg: 'bg-emerald-100',
 text: 'Create a management representation letter'
 },
 {
 icon: <Mail className="h-5 w-5 text-blue-600" />,
 iconBg: 'bg-blue-100',
 text: 'Draft a client communication letter regarding independence'
 },
 {
 icon: <FileEdit className="h-5 w-5 text-violet-600" />,
 iconBg: 'bg-violet-100',
 text: 'Generate a confirmation letter for accounts receivable'
 },
 {
 icon: <Mail className="h-5 w-5 text-amber-600" />,
 iconBg: 'bg-amber-100',
 text: 'Create a fee arrangement letter for advisory services'
 },
 {
 icon: <FileEdit className="h-5 w-5 text-rose-600" />,
 iconBg: 'bg-rose-100',
 text: 'Draft an audit findings communication letter'
 },
 ],
 note: [
 {
 icon: <StickyNote className="h-5 w-5 text-primary" />,
 iconBg: 'bg-primary/10',
 text: 'Create a professional audit note documenting independence considerations'
 },
 {
 icon: <FileText className="h-5 w-5 text-emerald-600" />,
 iconBg: 'bg-emerald-100',
 text: 'Generate a file note summarizing risk assessment discussions'
 },
 {
 icon: <StickyNote className="h-5 w-5 text-blue-600" />,
 iconBg: 'bg-blue-100',
 text: 'Write an internal note explaining accounting policy decisions'
 },
 {
 icon: <FileText className="h-5 w-5 text-violet-600" />,
 iconBg: 'bg-violet-100',
 text: 'Create a memo documenting significant estimates and judgments'
 },
 {
 icon: <StickyNote className="h-5 w-5 text-amber-600" />,
 iconBg: 'bg-amber-100',
 text: 'Generate a note on related party transaction analysis'
 },
 {
 icon: <FileText className="h-5 w-5 text-rose-600" />,
 iconBg: 'bg-rose-100',
 text: 'Write a working paper note for substantive testing procedures'
 },
 ],
};

const placeholdersByType: Record<ContentType, string> = {
 checklist: "Describe the checklist you want to generate (e.g., 'Generate the full Independence checklist as per CSRS 4200 for compilation').",
 worksheet: "Describe the worksheet you want to generate (e.g., 'Create a materiality calculation worksheet for a mid-size audit client').",
 letter: "Describe the letter you want to generate (e.g., 'Draft an engagement letter for compilation services').",
 note: "Describe the note you want to generate (e.g., 'Create a file note documenting independence considerations').",
};

export default function Generate() {
 const navigate = useNavigate();
 const location = useLocation();
 const [contentType, setContentType] = useState<ContentType>('checklist');
 const [detailLevel, setDetailLevel] = useState<DetailLevel>('standard');
 const [phase, setPhase] = useState<GenerationPhase>('prompt');
 
 const [prompt, setPrompt] = useState('');
 const [displayedPrompts, setDisplayedPrompts] = useState<ExamplePrompt[]>(promptsByType.checklist);

 // Handle content type from navigation state
 useEffect(() => {
 const navState = location.state as { contentType?: SidebarContentType } | null;
 if (navState?.contentType) {
 const mappedType = sidebarToGenerateType[navState.contentType];
 setContentType(mappedType);
 setDisplayedPrompts(promptsByType[mappedType]);
 // Clear state to prevent persistence on refresh
 navigate('/generate', { replace: true, state: null });
 }
 }, [location.state, navigate]);

 const handleShuffle = () => {
 const currentPrompts = promptsByType[contentType];
 const shuffled = [...currentPrompts].sort(() => Math.random() - 0.5);
 setDisplayedPrompts(shuffled);
 };

 const handlePromptClick = (text: string) => {
 setPrompt(text);
 };

 const handleGenerate = () => {
 if (!prompt.trim()) {
 toast.error('Please enter a prompt to generate content');
 return;
 }

 if (contentType !== 'checklist') {
 toast.error('Only Checklist generation is available in this prototype');
 return;
 }

 // Move to preview phase - show progressive generation
 setPhase('preview');
 };

 const handleAcceptAndSave = (folderId: string, folderName: string, checklistName: string) => {
 toast.success(`"${checklistName}" saved to "${folderName}"`);
 
 // Get existing saved checklists from localStorage
 const existingChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 const newChecklistId = `checklist-${Date.now()}`;
 const newChecklist = {
 id: newChecklistId,
 name: checklistName,
 folderId,
 folderName,
 prompt,
 detailLevel,
 createdAt: new Date().toISOString(),
 data: null, // Will be populated after full generation
 };
 writeJsonToLocalStorage('savedChecklists', [...existingChecklists, newChecklist]);
 
 // Dispatch custom event to notify Sidebar
 window.dispatchEvent(new CustomEvent('checklistSaved', { detail: newChecklist }));
 
 // Navigate to home page to build the full checklist form
 navigate('/builder', {
 state: {
 generate: {
 prompt,
 scope: detailLevel,
 checklistName,
 savedChecklistId: newChecklistId, // Pass ID for updating after generation
 },
 },
 });
 };

 const handleRegenerate = (newPrompt?: string) => {
 if (newPrompt) {
 setPrompt(newPrompt);
 }
 // Reset and restart the generation preview
 setPhase('prompt');
 setTimeout(() => setPhase('preview'), 100);
 };

 const handleCancelGeneration = () => {
 setPhase('prompt');
 };

 return (
 <Layout title="Templates">
 <div className="min-h-full bg-gradient-to-r from-[#ECD4F6] to-[#CFE1FC]">
 <div className="max-w-4xl mx-auto px-4 py-8">
 {/* Back Button */}
 <button
 onClick={() => phase === 'preview' ? handleCancelGeneration() : navigate('/')}
 className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
 >
 <ArrowLeft className="h-4 w-4" />
 <span>Back</span>
 </button>

 {/* Header */}
 <div className="text-center mb-8">
 <h1 className="text-3xl font-bold text-foreground mb-3 italic tracking-tight">
 {phase === 'preview' ? 'Review Questions' : `Generate ${contentTypeLabels[contentType]}`}
 </h1>
 </div>

 {phase === 'prompt' ? (
 <>

 {/* Prompt Input */}
 <div className="mb-6">
 <Textarea
 value={prompt}
 onChange={(e) => setPrompt(e.target.value)}
 placeholder={placeholdersByType[contentType]}
 className="w-full min-h-[80px] py-4 px-5 text-base bg-card border-border rounded-xl focus:ring-2 focus:ring-primary/20 resize-none"
 rows={2}
 />
 </div>

 {/* Generate Button */}
 <div className="flex justify-center mb-8">
 <div className="relative group focus-within:scale-105 hover:scale-105 active:scale-95 transition-transform duration-200 active:duration-75">
 {/* Animated border shine - only on hover/focus */}
 <span className="absolute inset-0 rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
 <span className="absolute inset-[-2px] rounded-xl bg-gradient-to-r from-[#3379C9] via-white to-[#8A5BD9]" />
 <span className="absolute inset-[-2px] rounded-xl overflow-hidden">
 <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full group-hover:translate-x-full group-focus-within:translate-x-full transition-transform duration-1000 ease-in-out" />
 </span>
 </span>
 <button
 onClick={handleGenerate}
 className="relative px-8 py-4 text-base font-medium text-white rounded-xl shadow-md bg-gradient-to-r from-[#3379C9] to-[#8A5BD9] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#8A5BD9] focus:ring-offset-2 transition-shadow duration-200"
 >
 <span className="relative flex items-center justify-center">
 <svg className="h-5 w-5 mr-2" viewBox="0 0 19 25" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M11.8719 9.99219H16.5288C16.9122 10.0285 18.0624 10.1918 18.3617 10.8997C18.5861 11.426 18.343 12.143 17.7726 12.7147C13.8731 16.6442 9.9829 20.5827 6.0834 24.5122C5.74675 24.6211 5.53167 24.6211 5.43816 24.5122C5.25113 24.3035 5.51297 23.7045 6.24237 22.6972C9.04777 19.3667 11.8532 16.0452 14.6586 12.7147L6.67254 9.99219H11.8625H11.8719Z" fill="white"/>
 <path d="M6.57738 14.6017H1.91708C1.5334 14.5654 0.382364 14.402 0.0829068 13.6942C-0.141686 13.1678 0.101623 12.4509 0.672462 11.8792C4.5654 7.94062 8.4677 4.01115 12.3606 0.081675C12.6975 -0.027225 12.9128 -0.027225 13.0063 0.081675C13.1935 0.2904 12.9315 0.88935 12.2015 1.89667C9.39414 5.2272 6.58673 8.54865 3.77933 11.8792L11.7711 14.6017H6.57738Z" fill="white"/>
 </svg>
 Generate
 </span>
 </button>
 </div>
 </div>

 {/* Example Prompts */}
 <div className="mb-8">
 <div className="flex items-center justify-center gap-4 mb-6">
 <div className="h-px bg-border flex-1 max-w-[120px]" />
 <span className="text-muted-foreground text-sm font-medium">Example prompts</span>
 <div className="h-px bg-border flex-1 max-w-[120px]" />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {displayedPrompts.map((item, index) => (
 <button
 key={index}
 onClick={() => handlePromptClick(item.text)}
 className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all text-left group"
 >
 <div className={`p-2.5 rounded-lg ${item.iconBg} shrink-0`}>
 {item.icon}
 </div>
 <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
 {item.text}
 </p>
 </button>
 ))}
 </div>
 </div>

 {/* Shuffle Button */}
 <div className="flex justify-center">
 <Button
 variant="outline"
 onClick={handleShuffle}
 className="rounded-full px-6 bg-card hover:bg-white/90"
 >
 <Shuffle className="h-4 w-4 mr-2" />
 Shuffle
 </Button>
 </div>
 </>
 ) : (
 /* Preview Phase - Show progressive question generation */
 <GenerationPreview
 prompt={prompt}
 detailLevel={detailLevel}
 onAccept={handleAcceptAndSave}
 onRegenerate={handleRegenerate}
 onCancel={handleCancelGeneration}
 />
 )}
 </div>
 </div>
 </Layout>
 );
}
