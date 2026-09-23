# PDF design

"Design an interactive prototype for the new AI Checklist Builder, named 'Countable AI Checklist Generator.'

A. Initial Generation Flow:
Entry Point: The user selects 'Add New Checklist' and is presented with a central 'Drop Box' or prompt field with the placeholder: 'Drop a document or describe the checklist you need (e.g., 'Generate the full independence checklist as per CSRS 4200 requirements for compilation').'
Data Ingestion: Allow for two inputs:
Text Prompt: User types a request.
Document Drop: User uploads a file (e.g., a BRD or a prior-year workpaper).
Generation Interface: After input, display a quick option to set Generation Scope/Detail (e.g., Concise, Standard, Detailed) before the AI generates the content.
Result: The AI instantly generates the complete checklist, displaying it as a set of separate, stacked, editable 'Question Cards' (similar to a Gamma 'card' or Monday 'item').
B. Question Card Structure and Editing (In-Line Editing):

Design the layout for the generated checklist to include the following elements, ensuring all edits happen directly within the card/block, not in a side panel:
Move Handle: A drag-and-drop handle (FR-3/FR-13) next to the numbering to allow users to move (reorder) the main question card up or down.
Question Field: The main text of the question, which is directly editable on click.
Answer Field: Supports multiple answer types (FR-5):
'Yes / No' radio buttons.
'Dropdown' or 'Multiple Choice.'
'Long Answer' or 'Short Answer' text boxes.
AI/Luka Button (FR-11): A small AI/Luka icon inside the long answer box that allows users to instantly Summarize, Improve Writing, or Generate a Draft Answer based on the prompt/document context (FR-3, FR-20).
Configuration/Settings: A small overflow menu (...) on each card to access:
Required/Not Required toggle.
Convert Question Type (e.g., change from Yes/No to Multiple Choice).
Add Sub-Question: A clear button/link to add a nested sub-question that is also fully reorderable (FR-3).
Delete Question (FR-4).
Move to Category (FR-14).
C. Global Features & Framework:
Section/Category Management (FR-11): Include a control to 'Add Section/Category' (which functions like an 'Add Group' in a Monday board). Users should be able to move entire sections/categories up and down (FR-11).
Toolbar Actions (FR-11): Include top-level actions for the finalized checklist: Export (PDF & Word), Share with Client, Preview.
"Add New Block" Button: A prominent '+' button at the bottom of the checklist to add a new block/question card, either 'from a Template' or 'using AI.'
2. Focused Prompt: In-Line AI Editing Capabilities

This prompt isolates the key requirement for AI-powered content modification within an existing checklist question's answer field.

Objective: Prototype the in-line AI editing features for a 'Long Answer' question type.

Prompt for Lovable:

"Design an interaction flow that demonstrates the AI-driven editing tools within a 'Long Answer' question type on the Checklist Builder prototype.
Scenario Setup: Display one Question Card with the question type set to 'Long Answer.' The answer field contains a draft response: 'We believe all necessary steps have been completed to comply with the independence requirements.'
Activation: The user clicks the AI/Luka icon within the text box.
Editing Menu: A small, context-aware menu appears with the following options (inspired by FR-20 and general AI capabilities):
Replace 'We' with 'I' (Directly applies FR-20 and updates the text).
Make Shorter (Truncates the existing answer).
Improve Writing (Refines the grammar/tone).
Generate Summary (If the answer is a long block of text).
Generate Draft Answer (A tool to start from scratch based on the original checklist prompt).
Interaction: The prototype should show the user selecting 'Replace 'We' with 'I'' and the text in the Long Answer box instantly updating to 'I believe all necessary steps have been completed to comply with the independence requirements.'
Final State: The user can continue typing or click outside the box to save the change."
use - flow structure like Gamma

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://checklist-genie-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ab1e700f-e5f3-4444-a851-67e23463310c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
