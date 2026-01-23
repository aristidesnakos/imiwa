# Open Source CRM Recommendations for Educational Outreach

## Your Requirements

You need a system that enables: **Contact List → Template → Customize (with AI) → Send → Track**

Key requirements:
- Open source (self-hosted control)
- AI-powered personalization
- Email automation and tracking
- Smooth relationship management
- Developer-friendly for customization

---

## Top Recommendations (Ranked)

### 🥇 1. **Twenty CRM** + AI Integration (Best Overall)

**Why this is #1 for you:**
- Modern, developer-first architecture (TypeScript, Next.js)
- Growing rapidly (35K+ GitHub stars)
- Built for customization and API integrations
- Email synchronization built-in
- Perfect for tech-savvy users

**AI Integration Strategy:**
Since Twenty doesn't have native AI, you'd integrate:
- OpenAI API for email personalization
- Custom workflow with your templates
- Can build custom AI features using their API

**Your Workflow:**
```
CSV Import → Twenty CRM → Custom AI Script (OpenAI) → Email Send → Track in Twenty
```

**Pros:**
✅ Most modern architecture
✅ Developer-friendly (you can build exactly what you need)
✅ Active community and rapid development
✅ Clean UI, great for relationship management
✅ Free and open source

**Cons:**
❌ Requires development work for AI integration
❌ Some features still in development (reporting)
❌ Newer platform (less mature than competitors)

**Setup Complexity:** Medium (requires some development)

**Links:**
- [Twenty.com](https://twenty.com/)
- GitHub: github.com/twentyhq/twenty

---

### 🥈 2. **Odoo CRM** (Best Built-in AI)

**Why this works:**
- Native AI lead scoring and automation
- Comprehensive email campaign management
- Mature, enterprise-level features
- Large ecosystem of apps and integrations
- AI-driven lead prioritization built-in

**AI Capabilities:**
- Native AI lead scoring
- Automated email personalization
- AI-powered workflow automation
- Smart scheduling and campaign optimization

**Your Workflow:**
```
CSV Import → Odoo CRM → AI Lead Scoring → Email Campaign Module → Track & Manage
```

**Pros:**
✅ Most comprehensive out-of-the-box solution
✅ Native AI features (no extra integration needed)
✅ Full email marketing suite included
✅ Huge ecosystem and community
✅ Can scale with you

**Cons:**
❌ Heavier/more complex than needed for your use case
❌ Steeper learning curve
❌ Can be overkill for simple outreach
❌ Community edition has limitations

**Setup Complexity:** Medium-High (powerful but complex)

**Best for:** If you want enterprise features and plan to scale significantly

---

### 🥉 3. **SuiteCRM** + AI Email Generator Module (Most Flexible)

**Why this works:**
- Mature, stable platform (fork of SugarCRM)
- AI Email Generator add-on available (ChatGPT-powered)
- Full email campaign manager built-in
- Workflow automation
- Good middle ground between features and simplicity

**AI Capabilities:**
- ChatGPT-4 powered personalized email generation (via module)
- Smart timing for email delivery
- Workflow and process automation
- Can integrate with external AI services

**Your Workflow:**
```
CSV Import → SuiteCRM → AI Email Generator Module → Campaign Manager → Track
```

**Pros:**
✅ Balanced feature set
✅ Available AI email module (ChatGPT integration)
✅ Mature and stable
✅ Good documentation and community
✅ REST API for custom integrations

**Cons:**
❌ UI feels dated compared to Twenty
❌ AI module is paid add-on
❌ PHP-based (older tech stack)

**Setup Complexity:** Medium

**Best for:** If you want proven stability with AI add-ons

---

### 🏆 4. **FluentCRM** (Best for Developers + WordPress Users)

**Why this could be perfect:**
- Self-hosted WordPress plugin
- Developer-friendly (100+ hooks, REST API)
- Email automation and campaigns
- Tag-based contact management
- Easy to extend with custom code

**AI Integration:**
- Integrate OpenAI via WordPress hooks
- Custom AI personalization via API
- Can build exactly what you need
- Lots of WordPress AI plugins to integrate

**Your Workflow:**
```
CSV Import → FluentCRM → Custom AI Plugin/Hook → Email Send → Track in WordPress
```

**Pros:**
✅ Extremely developer-friendly
✅ Easy to customize and extend
✅ Great if you already use WordPress
✅ Lightweight and fast
✅ Excellent documentation for developers
✅ Free and open source

**Cons:**
❌ Requires WordPress
❌ No native AI (need to build it)
❌ Less robust than enterprise CRMs
❌ Better for marketing automation than full CRM

**Setup Complexity:** Low-Medium (if familiar with WordPress)

**Best for:** If you're comfortable with WordPress and want maximum flexibility

---

### 🎯 5. **EspoCRM** (Best Lightweight Option)

**Why consider this:**
- Lightweight and fast
- Modern PHP architecture
- Email integration (Gmail/Outlook sync)
- REST API for customizations
- Modular and flexible

**AI Integration:**
- Integrate via REST API
- Custom workflow automation
- Can connect to external AI services

**Your Workflow:**
```
CSV Import → EspoCRM → Custom AI Integration → Email Module → Track
```

**Pros:**
✅ Lightweight and fast
✅ Clean, modern interface
✅ Good email integration
✅ Active development
✅ Flexible and modular

**Cons:**
❌ No native AI features
❌ Smaller community than Odoo/SuiteCRM
❌ More basic email features
❌ Requires custom development for AI

**Setup Complexity:** Low-Medium

**Best for:** If you want something simple and fast, don't mind building AI yourself

---

## My Recommendation for Your Use Case

### 🎯 **Best Choice: Twenty CRM + Custom AI Integration**

**Why:**

1. **Modern Stack**: You're clearly tech-savvy (working with Next.js, TypeScript per your codebase). Twenty's stack matches yours.

2. **Developer-First**: Built for customization, which is what you need for AI integration

3. **Future-Proof**: Most active development, modern architecture

4. **Your Workflow Achievable:**
   ```
   1. Import CSV contacts into Twenty
   2. Build a simple Node.js script using:
      - Twenty's API (to pull contact data)
      - OpenAI API (to personalize templates based on contact info)
      - Resend API (you already use this for email)
      - Twenty's API (to log sent emails and track)
   3. Set up email tracking via Twenty's email sync
   4. Manage relationships in Twenty's clean UI
   ```

### 📦 **Alternative if you want something faster: Odoo CRM**

If you don't want to build custom AI integration and prefer out-of-the-box:
- Odoo has native AI features
- Comprehensive email campaigns
- More mature, but also more complex

---

## Implementation Roadmap (Twenty CRM + AI)

### Phase 1: Setup (Week 1)
- [ ] Install Twenty CRM (Docker/self-hosted)
- [ ] Import your contacts CSV
- [ ] Familiarize with Twenty's API
- [ ] Set up email account integration

### Phase 2: AI Integration (Week 2-3)
- [ ] Create Node.js automation script:
  ```typescript
  // Pseudocode for your workflow

  // 1. Fetch contacts from Twenty API
  const contacts = await twentyAPI.getContacts({
    filter: { status: 'prospect', category: 'university' }
  });

  // 2. For each contact, personalize email using OpenAI
  for (const contact of contacts) {
    const template = selectTemplate(contact.type); // university vs community college

    const personalizedEmail = await openai.createCompletion({
      prompt: `
        Personalize this email template for ${contact.name} at ${contact.institution}.
        Research context: ${contact.notes}
        Template: ${template}
        Keep it professional, mention specific program details.
      `,
      model: "gpt-4"
    });

    // 3. Send via Resend (you already use this)
    await resend.emails.send({
      to: contact.email,
      subject: personalizedEmail.subject,
      html: personalizedEmail.body
    });

    // 4. Log in Twenty CRM
    await twentyAPI.createActivity({
      contactId: contact.id,
      type: 'email_sent',
      content: personalizedEmail.body,
      timestamp: new Date()
    });
  }
  ```

- [ ] Test with 5-10 contacts
- [ ] Refine prompts and templates

### Phase 3: Automation & Tracking (Week 4)
- [ ] Set up email open/click tracking (Resend has this)
- [ ] Create follow-up automation
- [ ] Build simple dashboard for tracking
- [ ] Set up response handling

### Phase 4: Scale (Ongoing)
- [ ] Send batches of personalized emails
- [ ] Track responses in Twenty
- [ ] Refine AI prompts based on response rates
- [ ] Build relationship management workflows

---

## Cost Comparison

| Solution | Hosting | AI Integration | Total/Month |
|----------|---------|----------------|-------------|
| **Twenty** | Self-hosted: $5-20 (VPS) | OpenAI API: ~$10-30 | **$15-50** |
| **Odoo** | Self-hosted: $5-20 (VPS) | Built-in (limited free) | **$5-20** |
| **SuiteCRM** | Self-hosted: $5-20 (VPS) | AI Module: $99-299 one-time | **$5-20 + module** |
| **FluentCRM** | Self-hosted: $5-20 (VPS) | OpenAI API: ~$10-30 | **$15-50** |
| **EspoCRM** | Self-hosted: $5-20 (VPS) | OpenAI API: ~$10-30 | **$15-50** |

*All assume self-hosting. VPS pricing from DigitalOcean, Hetzner, or similar.*

---

## Technical Stack for Twenty + AI Solution

```yaml
Infrastructure:
  - CRM: Twenty (self-hosted on VPS)
  - Database: PostgreSQL (comes with Twenty)
  - Email: Resend API (you already use)

Automation:
  - Runtime: Node.js/TypeScript
  - AI: OpenAI API (GPT-4)
  - Scheduling: Node-cron or similar

APIs:
  - Twenty REST API (contact management)
  - OpenAI API (personalization)
  - Resend API (email sending + tracking)

Optional:
  - n8n (workflow automation - open source Zapier alternative)
  - Bull Queue (job queue for sending emails)
```

---

## Quick Start Script (Proof of Concept)

Here's a starter script you could use:

```typescript
// outreach-automation.ts

import { Configuration, OpenAIApi } from 'openai';
import { Resend } from 'resend';

// Configure APIs
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
const resend = new Resend(process.env.RESEND_API_KEY);

// Read your CSV
import fs from 'fs';
import csv from 'csv-parser';

interface Contact {
  institution: string;
  name: string;
  email: string;
  title: string;
  type: 'university' | 'community_college';
  notes?: string;
}

async function personalizeEmail(contact: Contact, template: string): Promise<string> {
  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a professional outreach specialist for an educational kanji learning platform.'
      },
      {
        role: 'user',
        content: `
          Personalize this email for:
          - Name: ${contact.name}
          - Title: ${contact.title}
          - Institution: ${contact.institution}
          - Type: ${contact.type}
          - Notes: ${contact.notes || 'N/A'}

          Template:
          ${template}

          Make it personal and specific. Reference their institution naturally.
        `
      }
    ]
  });

  return response.data.choices[0].message.content;
}

async function sendOutreach() {
  const contacts: Contact[] = [];

  // Read CSV
  fs.createReadStream('japanese-institutions-contacts.csv')
    .pipe(csv())
    .on('data', (row) => {
      if (row.Email) { // Only contacts with emails
        contacts.push({
          institution: row.Institution,
          name: row['Contact Name'],
          email: row.Email,
          title: row.Title,
          type: row['Institution Type'].toLowerCase().includes('community')
            ? 'community_college'
            : 'university',
          notes: row.Notes
        });
      }
    })
    .on('end', async () => {
      console.log(`Found ${contacts.length} contacts with emails`);

      // Process each contact
      for (const contact of contacts) {
        try {
          // Select appropriate template
          const template = contact.type === 'community_college'
            ? COMMUNITY_COLLEGE_TEMPLATE
            : UNIVERSITY_TEMPLATE;

          // Personalize with AI
          const personalizedContent = await personalizeEmail(contact, template);

          // Send email
          await resend.emails.send({
            from: 'your-name@yourdomain.com',
            to: contact.email,
            subject: `Free Kanji Learning Resource for ${contact.institution}`,
            html: personalizedContent
          });

          console.log(`✓ Sent to ${contact.name} at ${contact.institution}`);

          // Rate limit (don't spam)
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

        } catch (error) {
          console.error(`✗ Failed for ${contact.name}:`, error.message);
        }
      }
    });
}

// Run it
sendOutreach();
```

---

## Alternative: n8n Workflow (No-Code/Low-Code)

If you prefer visual workflows, consider **n8n** (open source automation):

```
[Twenty CRM: Get New Contacts]
    ↓
[Filter: Not Contacted Yet]
    ↓
[OpenAI: Personalize Template]
    ↓
[Resend: Send Email]
    ↓
[Twenty CRM: Mark as Contacted]
    ↓
[Wait 7 Days]
    ↓
[Check: Did They Reply?]
    ↓ No
[OpenAI: Generate Follow-up]
    ↓
[Resend: Send Follow-up]
    ↓
[Twenty CRM: Update Status]
```

n8n has native integrations with OpenAI and most CRMs, and can be self-hosted.

---

## Next Steps

1. **Choose your CRM**: I recommend Twenty for your use case
2. **Set up a test environment**: Deploy Twenty on a VPS (DigitalOcean $6/month droplet works)
3. **Import 5-10 test contacts**: Test the workflow manually
4. **Build the AI integration**: Start with the script above
5. **Test with real outreach**: Send to 10 contacts, measure response rate
6. **Scale gradually**: Refine based on feedback

---

## Questions to Consider

1. **Volume**: How many contacts will you email per week/month?
   - <50/month: Simple script is fine
   - 50-200/month: CRM becomes essential
   - 200+/month: Need robust automation

2. **Technical Comfort**: How much do you want to build vs. buy?
   - Love coding: Twenty + Custom AI
   - Want it working fast: Odoo
   - WordPress user: FluentCRM

3. **Budget**: What can you spend monthly?
   - $0-20: Self-host everything, OpenAI only cost
   - $20-100: Can use AI modules/services
   - $100+: Consider commercial solutions

---

## Resources

- **Twenty CRM**: https://twenty.com/
- **Odoo**: https://www.odoo.com/
- **SuiteCRM**: https://suitecrm.com/
- **FluentCRM**: https://fluentcrm.com/
- **n8n**: https://n8n.io/
- **OpenAI API**: https://platform.openai.com/
- **Resend**: https://resend.com/ (you already use this)

Let me know which direction you want to go, and I can help you get started!
