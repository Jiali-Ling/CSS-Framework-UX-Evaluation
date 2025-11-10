- Share design tokens and theme scripts under `shared/`; the two versions of Bulma/Bootstrap have the same three-page structure: `index.html`, `submit.html`, `feedback.html`. - Theme switching in the lower left corner, the secondary button in the upper right corner, and the appearance of cards/forms/tables are fully aligned.

Open method: - Open `bulma-version/*.html` or `bootstrap-version/*.html` directly with a browser, an Internet connection is required to load the framework file from CDN.

# Honours Project – Comparative Evaluation of User Experience in CSS 

# Frameworks 

Student: Jiali Ling 

Supervisor: Derek Turner    

Moderator: Pablo Salva Garcia

Course: BSc (Hons) in …Web and Mobile Development 

Banner ID: B01812585 

## Project Overview 

This project compares the usability and accessibility of two modern CSS frameworks —

Bootstrap and Bulma — to understand how framework design impacts user experience 

and accessibility compliance. 

It focuses on evaluating: 

1. Usability and design consistency between frameworks. 

2. Accessibility performance based on WCAG 2.2 Level AA. 

3. User satisfaction through structured usability testing. 

Both frameworks were implemented into functionally identical prototypes of an 

Assignment Submission Portal, designed and developed with consistent layout, colour 

tokens, and feedback components. 

## Project Structure 

workbench/ 

│

├── bootstrap-version/ # Bootstrap prototype 

│ ├── index.html 

│ ├── submit.html 

│ ├── feedback.html 

│ ├── success.html 

│ └── shared/ # Shared CSS and JS 

│

├── bulma-version/ # Bulma prototype 

│ ├── index.html 

│ ├── submit.html 

│ ├── feedback.html │ ├── success.html 

│ └── shared/ 

│

├── shared/ # Global design tokens and theme files 

│ ├── css/ 

│ └── js/ 

│

├── admin/ # Additional admin interface 

│

├── README.md # This documentation 

└── design-tokens-starter.code-workspace # VSCode project setup 

## How to Run 

Option A – Local Browser Preview 

1. Unzip the project folder workbench.zip. 

2. Navigate into either: 

- bulma-version/ → open index.html 

- bootstrap-version/ → open index.html 

3. Right-click → Open with Browser (Chrome/Edge). 

## Accessibility Evaluation (WCAG 2.2 – Level AA) 

Accessibility testing was performed using Lighthouse, WAVE, and Axe DevTools. All 

tools follow WCAG 2.2 (Web Content Accessibility Guidelines), focusing on the four 

key principles: Perceivable, Operable, Understandable, and Robust (POUR). 

Tool Comparison: 

- Google Lighthouse: Quantitative accessibility score (0 –100). 

- WAVE (WebAIM): Visual accessibility evaluation (error overlay). 

- Axe DevTools (Deque): Detailed issue inspection (severity and fixes). 

Example Results: 

Bootstrap: Lighthouse 92, WAVE 3 errors, Axe 12 issues. 

Bulma: Lighthouse 86, WAVE 7 errors, Axe 19 issues. WCAG 2.2 Criteria Referenced 

Perceivable: 1.1.1 Text Alternatives — All images include descriptive alt text. 

Operable: 2.1.1 Keyboard — All features can be accessed using keyboard only. 

Understandable: 3.3.1 Error Identification — Forms clearly display validation errors. 

Robust: 4.1.2 Name, Role, Value — Proper use of semantic HTML and ARIA roles. 

## Usability Testing 

User testing was conducted with 10 –15 undergraduate participants. Each user completed 

identical tasks (login, submission, feedback review) using both prototypes. 

Instruments: 

- System Usability Scale (SUS) 

- User Experience Questionnaire (UEQ) 

Results Summary: 

- Average SUS Score: 72/100. 

- Bootstrap perceived as more consistent and structured. 

- Bulma preferred for simplicity and responsive layout. 

## Project Timeline 

Phase | Date Range | Deliverable 

Literature & Framework Review | Sep –Oct 2024 | Research foundation and design plan 

Prototype Development | Oct –Nov 2024 | Bootstrap & Bulma versions 

Accessibility & Usability Testing | Dec –Jan 2025 | Data collection and analysis 

Final Report & Submission | Feb –Mar 2025 | Discussion, reflection, and conclusions 

## References 

W3C (2023). Web Content Accessibility Guidelines (WCAG) 2.2. 

Deque Systems (2024). Axe DevTools Documentation. 

WebAIM (2024). WAVE Accessibility Evaluation Tool. 

Google (2024). Lighthouse Developer Tools Documentation. 

Brooke, J. (1996). SUS: A Quick and Dirty Usability Scale. 

Schrepp, M., Hinderks, A., & Thomaschewski, J. (2014). Design and Evaluation of a

User Experience Questionnaire (UEQ). 

Summary: 

This README provides documentation for the Honours Project “Comparative 

Evaluation of User Experience in CSS Frameworks ”, including technical structure, 

evaluation methodology, WCAG compliance, and usability testing workflow.
