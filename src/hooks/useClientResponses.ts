import { useState, useCallback, useEffect } from 'react';
import { Assignee, Checklist, Question } from '@/types/checklist';

export interface ClientResponse {
 questionId: string;
 questionText?: string;
 answer: string;
 explanation?: string;
 answeredBy?: Assignee;
}

export interface ClientResponseState {
 hasResponses: boolean;
 isShared: boolean;
 sharedAt: Date | null;
 totalQuestions: number;
 answeredQuestions: number;
 responses: ClientResponse[];
}

// Realistic explanation templates based on question context
const EXPLANATIONS: Record<string, string[]> = {
 'yes': [
 'Confirmed — all relevant documentation has been reviewed and verified.',
 'Yes, this was completed as part of our annual compliance review process.',
 'Verified and approved by management during the last board meeting on Jan 15, 2025.',
 'All required procedures were followed per firm policy.',
 ],
 'no': [
 'This item is pending — we are awaiting confirmation from the legal department.',
 'Not yet completed. Expected completion date is March 2025.',
 'This was deferred to next quarter due to resource constraints.',
 ],
 'na': [
 'Not applicable — the client is a private entity and this requirement only applies to public companies.',
 'N/A for this engagement type per CSQC standards.',
 'This does not apply as the entity falls below the threshold.',
 ],
 'long': [
 'We have reviewed the client\'s financial statements and confirmed all material balances are properly supported. The engagement team has documented key judgments in the working papers.',
 'Based on our assessment, the client maintains adequate internal controls over financial reporting. No significant deficiencies were identified during our review.',
 'The client provided all requested documentation within the agreed timeline. We have verified the completeness and accuracy of the information received.',
 'Management has represented that all related party transactions have been disclosed. We have performed independent verification procedures to corroborate these representations.',
 ],
 'amount': ['15000.00', '7500.50', '125000.00', '3200.75', '48500.00'],
 'date': ['2025-01-15', '2025-02-28', '2025-03-31', '2024-12-31'],
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Simulate client responses after sharing
const generateMockResponses = (checklist: Checklist, assignments: Record<string, Assignee>): ClientResponse[] => {
 const responses: ClientResponse[] = [];
 
 const processQuestion = (question: Question) => {
 let answer = '';
 let explanation: string | undefined;
 
 switch (question.answerType) {
 case 'yes-no':
 answer = Math.random() > 0.4 ? 'Yes' : 'No';
 // ~60% chance of adding an explanation
 if (Math.random() > 0.4) {
 explanation = pickRandom(EXPLANATIONS[answer.toLowerCase()]);
 }
 break;
 case 'yes-no-na':
 const opts = ['Yes', 'No', 'NA'];
 const weights = [0.6, 0.25, 0.15];
 const r = Math.random();
 answer = r < weights[0] ? opts[0] : r < weights[0] + weights[1] ? opts[1] : opts[2];
 if (Math.random() > 0.35) {
 explanation = pickRandom(EXPLANATIONS[answer.toLowerCase()]);
 }
 break;
 case 'long-answer':
 answer = pickRandom(EXPLANATIONS['long']);
 break;
 case 'date':
 answer = pickRandom(EXPLANATIONS['date']);
 break;
 case 'amount':
 answer = pickRandom(EXPLANATIONS['amount']);
 break;
 case 'dropdown':
 case 'multiple-choice':
 if (question.options && question.options.length > 0) {
 answer = question.options[Math.floor(Math.random() * question.options.length)];
 }
 break;
 case 'toggle':
 answer = Math.random() > 0.5 ? 'true' : 'false';
 break;
 default:
 answer = 'Confirmed';
 }
 
 if (answer) {
 const answeredBy: Assignee | undefined = assignments.__all__ ?? assignments[question.id];
 responses.push({
 questionId: question.id,
 questionText: question.text,
 answer,
 explanation,
...(answeredBy ? { answeredBy } : {}),
 });
 }
 
 if (question.subQuestions) {
 question.subQuestions.forEach(processQuestion);
 }
 };
 
 checklist.sections.forEach(section => {
 section.questions.forEach(processQuestion);
 });
 
 return responses;
};

// Count total questions in checklist
const countQuestions = (checklist: Checklist): number => {
 let count = 0;
 checklist.sections.forEach(section => {
 section.questions.forEach(q => {
 count++;
 if (q.subQuestions) {
 count += q.subQuestions.length;
 }
 });
 });
 return count;
};

export function useClientResponses(
 checklist: Checklist | null,
 assignments: Record<string, Assignee> = {}
) {
 const [state, setState] = useState<ClientResponseState>({
 hasResponses: false,
 isShared: false,
 sharedAt: null,
 totalQuestions: 0,
 answeredQuestions: 0,
 responses: []
 });
 
 const [isApplyingResponses, setIsApplyingResponses] = useState(false);
 const [currentApplyingIndex, setCurrentApplyingIndex] = useState(-1);
 const [applyingQuestionId, setApplyingQuestionId] = useState<string | null>(null);

 // Update total questions when checklist changes
 useEffect(() => {
 if (checklist) {
 setState(prev => ({
...prev,
 totalQuestions: countQuestions(checklist)
 }));
 }
 }, [checklist]);

 // Share with client - triggers response simulation after delay
 const shareWithClient = useCallback(() => {
 if (!checklist) return;

 setState(prev => ({
...prev,
 isShared: true,
 sharedAt: new Date(),
 hasResponses: false,
 responses: [],
 answeredQuestions: 0
 }));

 // Simulate client responding after 3 seconds
 setTimeout(() => {
 const mockResponses = generateMockResponses(checklist, assignments);
 setState(prev => ({
...prev,
 hasResponses: true,
 responses: mockResponses,
 answeredQuestions: mockResponses.length
 }));
 }, 3000);
 }, [checklist, assignments]);

 // Apply only selected responses
 const applyFilteredResponses = useCallback((
 questionIds: string[],
 onUpdateQuestion: (questionId: string, answer: string, explanation?: string, answeredBy?: Assignee) => void,
 onComplete: () => void
 ) => {
 const filtered = state.responses.filter(r => questionIds.includes(r.questionId));
 if (filtered.length === 0) return;

 setIsApplyingResponses(true);
 setCurrentApplyingIndex(0);

 const applyNext = (index: number) => {
 if (index >= filtered.length) {
 setIsApplyingResponses(false);
 setCurrentApplyingIndex(-1);
 setApplyingQuestionId(null);
 // Remove accepted responses; if all accepted, reset fully
 const acceptedIds = new Set(questionIds);
 setState(prev => {
 const remaining = prev.responses.filter(r => !acceptedIds.has(r.questionId));
 if (remaining.length === 0) {
 return {
...prev,
 hasResponses: false,
 responses: [],
 answeredQuestions: 0,
 isShared: false,
 sharedAt: null
 };
 }
 return {
...prev,
 responses: remaining,
 answeredQuestions: remaining.length
 };
 });
 onComplete();
 return;
 }

 const response = filtered[index];
 setApplyingQuestionId(response.questionId);
 setCurrentApplyingIndex(index);

 setTimeout(() => {
 onUpdateQuestion(response.questionId, response.answer, response.explanation, response.answeredBy);
 setTimeout(() => {
 applyNext(index + 1);
 }, 400);
 }, 200);
 };

 applyNext(0);
 }, [state.responses]);

 // Apply responses to checklist one by one
 const applyResponses = useCallback((
 onUpdateQuestion: (questionId: string, answer: string, explanation?: string, answeredBy?: Assignee) => void,
 onComplete: () => void
 ) => {
 applyFilteredResponses(
 state.responses.map(r => r.questionId),
 onUpdateQuestion,
 onComplete
 );
 }, [applyFilteredResponses]);

 // Reset state
 const resetState = useCallback(() => {
 setState({
 hasResponses: false,
 isShared: false,
 sharedAt: null,
 totalQuestions: checklist ? countQuestions(checklist) : 0,
 answeredQuestions: 0,
 responses: []
 });
 setIsApplyingResponses(false);
 setCurrentApplyingIndex(-1);
 setApplyingQuestionId(null);
 }, [checklist]);

 return {
...state,
 isApplyingResponses,
 currentApplyingIndex,
 applyingQuestionId,
 shareWithClient,
 applyResponses,
 applyFilteredResponses,
 resetState
 };
}
