import { useState } from 'react';
import { 
 RefreshCw, 
 Minimize2, 
 Wand2, 
 FileText, 
 PenLine,
 Check,
 Loader2
} from 'lucide-react';

interface AIEditMenuProps {
 text: string;
 position: { x: number; y: number };
 onClose: () => void;
 onApply: (newText: string) => void;
}

interface AIOption {
 id: string;
 label: string;
 icon: React.ReactNode;
 description: string;
}

const aiOptions: AIOption[] = [
 {
 id: 'replace-we',
 label: "Replace 'We' with 'I'",
 icon: <RefreshCw className="h-4 w-4" />,
 description: "Change first person plural to singular"
 },
 {
 id: 'shorter',
 label: 'Make Shorter',
 icon: <Minimize2 className="h-4 w-4" />,
 description: "Condense the text while keeping meaning"
 },
 {
 id: 'improve',
 label: 'Improve Writing',
 icon: <Wand2 className="h-4 w-4" />,
 description: "Enhance grammar and clarity"
 },
 {
 id: 'summarize',
 label: 'Generate Summary',
 icon: <FileText className="h-4 w-4" />,
 description: "Create a brief summary"
 },
 {
 id: 'draft',
 label: 'Generate Draft Answer',
 icon: <PenLine className="h-4 w-4" />,
 description: "Start fresh with AI-generated content"
 }
];

export function AIEditMenu({ text, position, onClose, onApply }: AIEditMenuProps) {
 const [isProcessing, setIsProcessing] = useState(false);
 const [selectedOption, setSelectedOption] = useState<string | null>(null);
 const [previewText, setPreviewText] = useState<string | null>(null);

 const handleOptionClick = async (optionId: string) => {
 setSelectedOption(optionId);
 setIsProcessing(true);

 // Simulate AI processing
 await new Promise(resolve => setTimeout(resolve, 800));

 let result = text;
 switch (optionId) {
 case 'replace-we':
 result = text.replace(/\bWe\b/g, 'I').replace(/\bwe\b/g, 'I').replace(/\bour\b/g, 'my').replace(/\bOur\b/g, 'My');
 break;
 case 'shorter':
 result = text.split('.').slice(0, 1).join('.') + '.';
 break;
 case 'improve':
 result = text.charAt(0).toUpperCase() + text.slice(1);
 if (!text.endsWith('.')) result += '.';
 break;
 case 'summarize':
 result = 'Summary: ' + text.substring(0, 50) + '...';
 break;
 case 'draft':
 result = 'Based on the requirements, I have verified compliance with all applicable standards and documented the necessary procedures.';
 break;
 }

 setPreviewText(result);
 setIsProcessing(false);
 };

 const handleApply = () => {
 if (previewText) {
 onApply(previewText);
 }
 };

 return (
 <>
 {/* Backdrop */}
 <div 
 className="fixed inset-0 z-40"
 onClick={onClose}
 />
 
 {/* Menu */}
 <div 
 className="fixed z-50 bg-card border rounded-xl shadow-xl p-2 w-72 animate-scale-in"
 style={{ 
 left: Math.min(position.x, window.innerWidth - 300),
 top: Math.min(position.y, window.innerHeight - 400)
 }}
 >
 <div className="flex items-center gap-2 px-3 py-2 mb-1">
 <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
 <Wand2 className="h-3.5 w-3.5 text-white" />
 </div>
 <span className="font-medium text-sm">AI Assistant</span>
 </div>

 <div className="space-y-1">
 {aiOptions.map((option) => (
 <button
 key={option.id}
 onClick={() => handleOptionClick(option.id)}
 disabled={isProcessing}
 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
 selectedOption === option.id
 ? 'bg-primary/10 text-primary'
 : 'hover:bg-muted'
 } ${isProcessing && selectedOption !== option.id ? 'opacity-50' : ''}`}
 >
 <div className={`text-muted-foreground ${selectedOption === option.id ? 'text-primary' : ''}`}>
 {isProcessing && selectedOption === option.id ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : (
 option.icon
 )}
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium">{option.label}</p>
 <p className="text-xs text-muted-foreground">{option.description}</p>
 </div>
 </button>
 ))}
 </div>

 {/* Preview */}
 {previewText && (
 <div className="mt-3 border-t pt-3">
 <p className="text-xs text-muted-foreground mb-2 px-3">Preview:</p>
 <div className="bg-muted/50 rounded-lg p-3 mx-1 mb-2">
 <p className="text-sm">{previewText}</p>
 </div>
 <div className="flex gap-2 px-1">
 <button
 onClick={onClose}
 className="flex-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleApply}
 className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
 >
 <Check className="h-3.5 w-3.5" />
 Apply
 </button>
 </div>
 </div>
 )}
 </div>
 </>
 );
}
