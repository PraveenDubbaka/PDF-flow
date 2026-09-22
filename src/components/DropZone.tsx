import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, Upload, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GenerationScope } from '@/types/checklist';
import { ContentType } from '@/components/Sidebar';

interface DropZoneProps {
 onGenerate: (prompt: string, scope: GenerationScope, file?: File) => void;
 contentType?: ContentType;
}
interface CreationOptionProps {
 icon: React.ReactNode;
 iconBg: string;
 title: string;
 description: string;
 badge?: { text: string; variant: 'recommended' | 'new' };
 onClick: () => void;
}

function CreationOption({ icon, iconBg, title, description, badge, onClick }: CreationOptionProps) {
 return (
 <button
 onClick={onClick}
 className="group relative flex flex-col bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-200 text-left h-full"
 >
 <div className={`w-full aspect-[4/3] rounded-lg mb-4 flex items-center justify-center ${iconBg}`}>
 <div className="transition-transform duration-500 group-hover:rotate-[360deg]">
 {icon}
 </div>
 </div>
 <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
 {title}
 </h3>
 <p className="text-sm text-muted-foreground leading-relaxed">
 {description}
 </p>
 {badge && (
 <span className={`mt-3 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg w-fit ${
 badge.variant === 'recommended' 
 ? 'bg-pink-100 text-pink-600' 
 : 'bg-teal-100 text-teal-600'
 }`}>
 {badge.variant === 'recommended' && <span className="text-pink-500">★</span>}
 {badge.text}
 </span>
 )}
 </button>
 );
}

const contentTypeLabels: Record<ContentType, string> = {
 letters: 'Letter',
 checklists: 'Checklist',
 reports: 'Report',
 notes: 'Notes to Financial Statements',
};

export function DropZone({ onGenerate, contentType }: DropZoneProps) {
 const navigate = useNavigate();
 const [mode, setMode] = useState<'import' | 'template' | null>(null);
 const [prompt, setPrompt] = useState('');
 const [file, setFile] = useState<File | null>(null);
 const [scope, setScope] = useState<GenerationScope>('standard');
 const [isDragging, setIsDragging] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleDragOver = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(true);
 };

 const handleDragLeave = () => {
 setIsDragging(false);
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(false);
 const droppedFile = e.dataTransfer.files[0];
 if (droppedFile) {
 setFile(droppedFile);
 }
 };

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const selectedFile = e.target.files?.[0];
 if (selectedFile) {
 setFile(selectedFile);
 }
 };

 const handleGenerate = () => {
 if (prompt.trim() || file) {
 onGenerate(prompt, scope, file || undefined);
 }
 };

 const handleBack = () => {
 setMode(null);
 setPrompt('');
 setFile(null);
 };

 // Mode-specific content
 if (mode) {
 return (
 <div className="max-w-2xl mx-auto animate-fade-in">
 <button
 onClick={handleBack}
 className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
 >
 <span>←</span>
 <span>Back to options</span>
 </button>



 {mode === 'import' && (
 <div>
 <h2 className="text-2xl font-bold text-foreground mb-2">Import File</h2>
 <p className="text-muted-foreground mb-6">Enhance existing docs or presentations</p>
 <div
 className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
 isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
 }`}
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 >
 <input
 type="file"
 ref={fileInputRef}
 onChange={handleFileSelect}
 className="hidden"
 accept=".pdf,.doc,.docx,.txt"
 />
 {file ? (
 <div className="flex items-center justify-center gap-3">
 <FileText className="h-8 w-8 text-primary" />
 <div className="text-left">
 <p className="font-medium">{file.name}</p>
 <p className="text-sm text-muted-foreground">
 {(file.size / 1024).toFixed(1)} KB
 </p>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={(e) => {
 e.stopPropagation();
 setFile(null);
 }}
 className="ml-4"
 >
 Remove
 </Button>
 </div>
 ) : (
 <div className="flex flex-col items-center gap-3">
 <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
 <Upload className="h-8 w-8 text-primary" />
 </div>
 <div>
 <p className="font-medium">Drop your document here</p>
 <p className="text-sm text-muted-foreground">
 PDF, Word, or text files supported
 </p>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {mode === 'template' && (
 <div>
 <h2 className="text-2xl font-bold text-foreground mb-2">Generate from Template</h2>
 <p className="text-muted-foreground mb-6">Fill in and customize a structured template</p>
 <div className="grid grid-cols-2 gap-4 mb-4">
 {['Client Acceptance', 'Independence Review', 'Engagement Letter', 'Quality Control'].map((template) => (
 <button
 key={template}
 onClick={() => setPrompt(`Generate a ${template} checklist`)}
 className={`p-4 border rounded-lg text-left hover:border-primary/50 transition-colors ${
 prompt.includes(template) ? 'border-primary bg-primary/5' : 'border-border'
 }`}
 >
 <LayoutTemplate className="h-5 w-5 text-primary mb-2" />
 <p className="font-medium text-sm">{template}</p>
 </button>
 ))}
 </div>
 </div>
 )}

 <div className="mt-6 flex items-center justify-between">
 <select
 value={scope}
 onChange={(e) => setScope(e.target.value as GenerationScope)}
 className="px-4 py-2 rounded-lg border bg-card text-sm"
 >
 <option value="standard">Standard</option>
 <option value="detailed">Detailed</option>
 </select>

 <Button
 onClick={handleGenerate}
 disabled={!prompt.trim() && !file}
 className="ai-button !px-6 !py-5"
 >
 <Sparkles className="h-4 w-4 mr-2" />
 Generate {contentType ? contentTypeLabels[contentType] : 'Checklist'}
 </Button>
 </div>
 </div>
 );
 }

 // Get heading based on content type
 const heading = contentType 
 ? `Create ${contentTypeLabels[contentType]} with LUKA`
 : 'Create with LUKA';

 // Main selection view
 return (
 <div className="max-w-4xl mx-auto animate-fade-in">
 {/* Header */}
 <div className="text-center mb-10">
 <h1 className="text-3xl font-bold text-foreground mb-2">
 {heading}
 </h1>
 <p className="text-muted-foreground text-lg">
 How would you like to get started?
 </p>
 </div>

 {/* Creation Options Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 <CreationOption
 icon={
 <svg width="48" height="52" viewBox="0 0 186 203" fill="none" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#3379C9"/>
 <stop offset="100%" stopColor="#8A5BD9"/>
 </linearGradient>
 </defs>
 <path d="M119.717 82.3955H166.681C170.547 82.6949 182.147 84.042 185.165 89.8796C187.428 94.2204 184.976 100.133 179.223 104.848C139.898 137.254 100.668 169.735 61.3425 202.141C57.9476 203.039 55.7786 203.039 54.8355 202.141C52.9494 200.42 55.59 195.48 62.9457 187.173C91.2371 159.706 119.529 132.314 147.82 104.848L67.2837 82.3955H119.623H119.717Z" fill="url(#iconGradient)"/>
 <path d="M66.3304 120.419H19.333C15.4638 120.12 3.856 118.773 0.836085 112.935C-1.42885 108.594 1.02483 102.682 6.78153 97.9669C46.0404 65.4859 85.3936 33.0797 124.652 0.673569C128.05 -0.224523 130.22 -0.224523 131.164 0.673569C133.052 2.39491 130.409 7.33442 123.048 15.6418C94.7364 43.1084 66.4248 70.5003 38.1131 97.9669L118.707 120.419H66.3304Z" fill="url(#iconGradient)"/>
 </svg>
 }
 iconBg="bg-gradient-to-r from-[#ECD4F6] to-[#CFE1FC]"
 title="Generate"
 description="Create from a one-line prompt in a few seconds"
 badge={{ text: 'RECOMMENDED', variant: 'recommended' }}
 onClick={() => navigate('/generate')}
 />
 
 
 <CreationOption
 icon={
 <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <linearGradient id="uploadIconGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
 <stop stopColor="#3379C9"/>
 <stop offset="1" stopColor="#8A5BD9"/>
 </linearGradient>
 </defs>
 <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="url(#uploadIconGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M17 8L12 3L7 8" stroke="url(#uploadIconGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M12 3L12 15" stroke="url(#uploadIconGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 }
 iconBg="bg-gradient-to-r from-[#ECD4F6] to-[#CFE1FC]"
 title="Import file or URL"
 description="Upload or paste the URL to generate"
 onClick={() => setMode('import')}
 />
 
 <CreationOption
 icon={
 <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <linearGradient id="templateIconGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
 <stop stopColor="#3379C9"/>
 <stop offset="1" stopColor="#8A5BD9"/>
 </linearGradient>
 </defs>
 <rect x="3" y="3" width="18" height="18" rx="2" stroke="url(#templateIconGradient)" strokeWidth="2"/>
 <path d="M3 9H21" stroke="url(#templateIconGradient)" strokeWidth="2"/>
 <path d="M9 21V9" stroke="url(#templateIconGradient)" strokeWidth="2"/>
 </svg>
 }
 iconBg="bg-gradient-to-r from-[#ECD4F6] to-[#CFE1FC]"
 title="Generate from template"
 description="Generate from existing templates"
 badge={{ text: 'NEW', variant: 'new' }}
 onClick={() => setMode('template')}
 />
 </div>
 </div>
 );
}
