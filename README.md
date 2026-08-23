# SARATHI 🇮🇳
## AI Civic & Legal Copilot for India

> **Your rights shouldn't be hidden behind paperwork.**

SARATHI is a multilingual AI civic and legal copilot designed to help Indian citizens move from a real-world problem to a clear, actionable next step.

Instead of forcing citizens to understand legal terminology, government departments, forms, portals, and scattered PDFs first, SARATHI starts with the citizen's problem in their own language and guides them through:

**Problem → Understanding → Rights → Action → Document**

SARATHI combines source-grounded AI, multilingual interaction, civic/legal workflow generation, deterministic welfare eligibility checks, and document drafting into one citizen-first experience.

---

## 🚨 The Problem

A citizen may know that something is wrong, but still not know:

- Whether they have a right or entitlement
- Which law, scheme, or process applies
- Which department or authority they should approach
- Which documents they need
- What exactly they should write
- Where to submit it
- What to do if the authority does not respond

The information often exists, but it is scattered across:

- Government portals
- PDFs and circulars
- Acts and notifications
- Scheme pages
- Application forms
- Grievance portals
- Legal terminology that is difficult for ordinary citizens to navigate

**The problem is not only access to information.  
The problem is turning information into action.**

---

# 💡 What SARATHI Does

SARATHI lets a citizen describe their situation naturally.

For example:

> **"Mera landlord mera security deposit wapas nahi de raha."**

SARATHI can then:

1. Understand the problem
2. Identify the likely civic/legal domain
3. Determine whether jurisdiction-specific information is required
4. Retrieve relevant authoritative sources
5. Explain the information in simple language
6. Ask only the missing questions needed to proceed
7. Generate a step-by-step action plan
8. Identify documents/evidence to keep
9. Identify the appropriate authority
10. Explain possible escalation
11. Generate an RTI/application/complaint where appropriate
12. Save the entire workflow as a reusable **Case**

---

# 🌏 Built for India

SARATHI is **multilingual-first**, not an English chatbot with translation added afterwards.

Users can interact using:

- English
- Hindi
- Hinglish
- Bengali
- Tamil
- Telugu
- Marathi
- Kannada
- Gujarati
- Punjabi
- Malayalam
- Odia
- and an architecture designed to expand to additional Indian languages

Input can be:

- Native Indian script
- Romanized text
- Code-mixed text
- Voice input

The user's **response language can also be changed independently for individual responses**.

For example:

**Input:** Hinglish  
**Response:** Hindi

or:

**Input:** Hindi  
**Response:** English

without losing the original case context.

---

# 🧭 The Core Workflow

```text
                         CITIZEN
                            │
                            ▼
                  Describe the problem
                            │
                            ▼
                  ┌──────────────────┐
                  │ Problem Analyzer │
                  └────────┬─────────┘
                           │
                           ▼
                    Jurisdiction Check
                           │
                           ▼
                  ┌──────────────────┐
                  │   RAG Retrieval  │
                  │ Official Sources │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Rights Navigator │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │  Action Planner  │
                  └────────┬─────────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         RTI Draft      Eligibility   Complaint /
                         Check         Application
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                       MY CASE
```

The goal is not to produce another AI chat window.

The goal is to **complete the civic workflow**.

---

# ✨ Key Features

## 🧠 Civic Problem Analyzer

SARATHI identifies what the user is actually dealing with.

It can classify problems across areas such as:

- RTI
- Consumer rights
- Tenant rights
- Workplace rights
- Welfare schemes
- Government services
- Public grievances
- Documentation
- Municipal issues
- Education/health-related civic schemes
- Identity/document issues

It extracts relevant entities, jurisdiction, urgency, missing information, and the appropriate next workflow.

---

## ⚖️ Rights Navigator

SARATHI translates complex civic/legal information into plain language.

Instead of only saying:

> "Refer to Section X."

it explains:

**What does this mean for you?**

**What may apply?**

**What can you do next?**

**Who should you approach?**

**What should you keep ready?**

---

## 🗺️ Civic Action Planner

The Action Planner is the heart of SARATHI.

It converts information into a concrete plan:

### Your Situation
A concise understanding of the user's problem.

### What May Apply
Relevant rights/options supported by authoritative sources.

### What To Do Next
Clear numbered steps.

### Documents / Evidence
What the citizen should keep ready.

### Where To Go
The relevant authority or official process.

### If They Don't Respond
A supported escalation path.

This turns SARATHI from an information chatbot into an **action-oriented civic assistant**.

---

## 📄 RTI Drafting

A citizen can explain what information they want in plain language.

SARATHI can:

- understand the information request
- help identify the likely authority
- ask only necessary details
- structure the application
- separate official facts from AI-drafted wording
- generate a downloadable **DOCX / PDF**

The goal is not to make citizens understand legal drafting first.

**SARATHI handles the drafting layer for them.**

---

## ✅ Welfare Scheme Eligibility

SARATHI includes a deterministic eligibility engine for supported schemes.

The workflow is:

```text
Citizen information
        ↓
Required fields collected conversationally
        ↓
Deterministic rule evaluation
        ↓
Matched / Missing / Excluded criteria
        ↓
Plain-language explanation
```

The LLM does **not** get to invent the final eligibility decision.

The system instead explains the result of a rule-based evaluation and clearly states that final eligibility is determined by the relevant authority.

---

## 📝 Conversational Form Filling

Instead of dropping a large government form on the user immediately, SARATHI can interview the citizen naturally.

Example:

> "What is your full name?"

> "What is your state?"

> "What was the amount involved?"

> "Do you have the agreement/document?"

Collected information can then be reused for:

- RTI applications
- complaints
- applications
- eligibility checks

---

## 📚 Source-Grounded Answers

SARATHI is designed for civic/legal reliability.

It prioritizes authoritative sources such as:

- Government portals
- Acts and legislation
- Official notifications
- Statutory bodies
- Government scheme documentation
- India Code
- Official grievance systems
- State government sources

The interface distinguishes between:

### 📄 Official Information
Information directly grounded in retrieved sources.

### 🤖 AI Guidance
Interpretation and practical next-step guidance.

This distinction helps prevent the AI from presenting generated guidance as law.

---

# 🔎 RAG / Knowledge Base

SARATHI uses a curated knowledge base instead of relying only on general model memory.

The retrieval pipeline is designed around:

```text
Official documents
      ↓
Text extraction
      ↓
Chunking
      ↓
Embeddings
      ↓
Semantic + keyword retrieval
      ↓
Source ranking
      ↓
Relevant context
      ↓
Grounded response
```

Sources are tagged with metadata such as:

- Issuing authority
- Jurisdiction
- Source tier
- Document type
- Publication date
- Verification date

---

# 🛡️ Anti-Hallucination Design

SARATHI is designed with explicit reliability constraints.

It should never knowingly:

- Invent laws
- Invent fees
- Invent deadlines
- Invent schemes
- Invent government departments
- Invent eligibility rules
- Fabricate URLs
- Present unsupported legal claims as facts

When authoritative information cannot be found, SARATHI is expected to say so.

Jurisdiction-sensitive questions should request the location/state when needed instead of guessing.

---

# 🌐 Multilingual Architecture

SARATHI separates:

**Input language**  
from  
**Internal reasoning**  
from  
**Response language**

Conceptually:

```text
User input
     │
     ▼
Language / script understanding
     │
     ▼
Canonical internal representation
     │
     ▼
RAG + reasoning
     │
     ▼
Structured result
     │
     ▼
Selected response language
     │
     ▼
Citizen
```

This allows a citizen to ask in one language and receive the final guidance in another.

The design also supports:

- Native-script input
- Romanized input
- Code-mixed queries
- Per-response language switching
- Voice input through Groq Whisper

---

# 🎙️ Voice Interaction

For voice input, SARATHI uses:

**Groq Whisper → Speech-to-Text**

The flow is:

```text
Microphone
    ↓
Audio recording
    ↓
Groq Whisper
    ↓
Transcribed text
    ↓
Existing SARATHI pipeline
```

Voice is intentionally treated as an input layer, not a separate reasoning system.

This means typed and spoken queries go through the same:

- Problem Analyzer
- RAG
- Reasoning
- Citation verification
- Language handling

pipeline.

---

# 🧠 AI Reliability Architecture

SARATHI uses a provider-independent AI layer.

### Primary
**Gemini**

### Fallback
**OpenRouter**

If the primary provider experiences a relevant quota/rate-limit/service failure, the fallback can be used without exposing provider details to the citizen.

The application's civic/legal safety rules remain active regardless of the provider used.

---

# 🎯 Basic vs Advanced Mode

SARATHI supports two response styles:

### Basic
For citizens who want:

- short
- crisp
- direct
- immediately actionable guidance

### Advanced
For citizens who want:

- detailed explanations
- deeper context
- complete action plans
- documents/evidence
- authority and escalation details

Changing the response mode does not remove source grounding.

---

# 📁 Case-Based Experience

SARATHI treats each problem as a **Case**, not just a chat session.

A Case can contain:

- Problem analysis
- Conversation
- Action Plan
- Sources
- Generated documents
- Form state
- Case status

This allows a citizen to return later without explaining everything again.

---

# 🔐 Security & Privacy

SARATHI is designed around minimum necessary data handling.

Key principles:

- Firebase authentication for identity
- User data scoped by authenticated UID
- Firestore security rules
- Private uploaded documents
- Server-side API keys
- No API credentials in client code
- Uploaded content treated as untrusted context
- Prompt-injection defenses
- Graceful AI/provider failures
- No fabricated fallback legal advice

---

# 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React / TypeScript |
| Styling | Tailwind CSS |
| Backend/API | TypeScript server/API routes |
| AI reasoning | Gemini |
| AI fallback | OpenRouter |
| Speech-to-Text | Groq Whisper |
| Authentication | Firebase Authentication |
| Database | Firebase Firestore |
| File storage | Firebase Storage |
| Retrieval | Embeddings + application-level retrieval |
| Document generation | DOCX / PDF generation |
| Deployment | Firebase / Google AI Studio compatible deployment |

> The exact implementation may evolve, but the design goal remains the same: **simple, reliable, and deployable within a hackathon environment.**

---

# 🧪 Reliability & Testing

SARATHI is designed to test more than whether an LLM returns text.

The test strategy covers:

### AI
- Hallucination probes
- Structured-output validity
- Provider fallback
- Malformed responses
- Irrelevant questions

### RAG
- Retrieval accuracy
- Citation correctness
- Source relevance
- Jurisdiction correctness

### Multilingual
- Same question across multiple languages
- Response-language switching
- Full-response localization
- Preservation of official names/citations

### Security
- Firebase authorization
- Prompt-injection resistance
- Private document access

### Product
- RTI flow
- Eligibility evaluation
- Case persistence
- Document generation
- Voice interaction

---

# 🎥 Demo Flow

SARATHI is best demonstrated through **real citizen problems**, not a generic AI prompt.

## Demo 1 — RTI in Hinglish

> **"Mere area mein pichle saal road repair par kitna paisa kharch hua? Mujhe RTI file karni hai."**

SARATHI:

→ understands the query  
→ identifies RTI  
→ retrieves official information  
→ identifies the relevant process  
→ explains what to request  
→ builds an action plan  
→ generates the RTI application

---

## Demo 2 — Regional Language

Ask a welfare question in a regional language.

SARATHI:

→ understands the language  
→ asks only required questions  
→ evaluates scheme criteria deterministically  
→ explains matched/missing criteria  
→ provides official sources

---

## Demo 3 — Tenant Rights

> **"My landlord in Punjab hasn't returned my ₹50,000 security deposit."**

SARATHI:

→ identifies tenant-rights context  
→ checks jurisdiction  
→ retrieves relevant sources  
→ explains what may apply  
→ gives a concrete action plan  
→ identifies documents/evidence  
→ gives escalation guidance  
→ can generate a formal draft

---

# 🆚 Why SARATHI?

### Chatbots answer questions.

### SARATHI helps solve civic problems.

| Traditional Approach | SARATHI |
|---|---|
| Search for laws | Start with the citizen's problem |
| Read long government PDFs | Get the relevant information explained |
| Figure out the department | Guided authority identification |
| Understand legal language | Plain-language explanation |
| Fill forms manually | Conversational information collection |
| Draft applications yourself | AI-assisted document generation |
| Generic answers | Jurisdiction-aware workflow |
| English-first | Multilingual India-first |
| Links without action | Problem → Action Plan → Document |

The differentiation is not:

> **"We use AI."**

It is:

> **"We turn fragmented civic information into a personalized, source-grounded action path."**

---

# 🚀 Quick Start

## 1. Clone

```bash
git clone <YOUR_REPOSITORY_URL>
cd sarathi
```

## 2. Install

```bash
npm install
```

## 3. Configure environment

Create your environment file using the variables required by the current deployment.

Typical configuration includes:

```env
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=

# Firebase configuration used by the current deployment
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_FIREBASE_CONFIG=
```

> Never commit real credentials.

## 4. Run

```bash
npm run dev
```

Then open the local development URL shown by the terminal.

---

# 📌 Project Status

**Hackathon MVP — Feature Complete**

Current focus:

- Multilingual civic/legal assistance
- Source-grounded responses
- Action planning
- RTI drafting
- Scheme eligibility
- Case persistence
- Voice input
- Responsive citizen-first interface

---

# 🔭 Future Scope

SARATHI can evolve toward:

- Wider national knowledge coverage
- More state-specific civic workflows
- Additional Indian-language support
- Government portal integrations where officially available
- Automated case reminders
- More document/form automation
- NGO / legal-aid workflows
- Continuous source verification
- Citizen grievance analytics
- Offline/low-connectivity experiences

The architecture is intentionally designed so additional civic domains can be added without changing the core workflow.

---

# ⚠️ Disclaimer

SARATHI provides general informational guidance based on publicly available sources.

It is **not a substitute for professional legal advice**, and final decisions regarding eligibility, legal rights, applications, or government action remain with the relevant authority.

---

# 👥 Team

**Team:** Sudarshan

**Members:**
- `<MEMBER 1>`
- `<MEMBER 2>`
- `<MEMBER 3>`
- `<MEMBER 4>`

**Institution:** `IIIT Allahabad`

---

# 🔗 Links

**Live Demo:** `https://sarathi-3pxi.onrender.com/`

**Demo Video:** `<DEMO_VIDEO_URL>`

**Repository:** `https://github.com/0xshellghost/Sarathi-AI-Civic-Legal-Copilot-For-India`

---

## SARATHI

### **Understand your rights. Know what to do next.**

Built for citizens.  
Built for India.  
Built to turn information into action.
