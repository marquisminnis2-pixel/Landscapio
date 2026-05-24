export default {
  clientName: "Landscapio",
  botName: "Luma",
  domain: "agent.landscapio.co",
  logo: null, // placeholder until real logo provided

  colors: {
    background:     "#060e06",
    surface:        "#0d1a0d",
    surfaceAlt:     "#111f11",
    primary:        "#6b8f3e",
    primaryDark:    "#2d5016",
    primaryDeep:    "#1a2e1a",
    accent:         "#4a7c2f",
    textBright:     "#c8dcc4",
    textMuted:      "#9ab897",
    textDim:        "#1a3a1a",
    textGhost:      "#132213",
    border:         "#0d1a0d",
    borderAccent:   "#1a2e1a",
    tooltipBg:      "#020802",
    tooltipBorder:  "#3a6b1e",
    tooltipText:    "#6dba3e",
  },

  fonts: {
    ui:      "'Cormorant', serif",
    prose:   "'Instrument Serif', serif",
    mono:    "'DM Mono', monospace",
  },

  systemPrompt: `You are Luma, an AI assistant for Landscapio — a professional landscaping services platform.
You help users write SEO blog posts, social media content, landing page copy, email campaigns, and any other content related to landscaping businesses.
Keep your tone warm, knowledgeable, and grounded. You care about nature, outdoor spaces, and helping landscaping businesses grow.
Always be helpful, concise, and professional. Tailor all content to the landscaping industry.`,

  tools: [
    { id: "blog",    label: "Blog"   },
    { id: "social",  label: "Social" },
    { id: "seo",     label: "SEO"    },
    { id: "email",   label: "Email"  },
    { id: "chat",    label: "Chat"   },
  ],

  suggestions: [
    {
      prompt: "Write a long-form SEO blog post about landscaping trends this season",
      label:  "Landscaping trends driving new business this season",
      tip:    "long-form seo content",
    },
    {
      prompt: "Write an SEO article about why homeowners should hire professional landscapers",
      label:  "Why homeowners hire professionals — SEO long-form",
      tip:    "trust-building · conversion",
    },
    {
      prompt: "Write a project showcase for a full backyard redesign with before and after narrative",
      label:  "Before & after — full backyard transformation story",
      tip:    "before & after narrative",
    },
    {
      prompt: "Write a spring lawn care guide for homeowners",
      label:  "Spring lawn care — a homeowner's complete guide",
      tip:    "seasonal · educational",
    },
  ],

  emptyState: {
    greeting: "Good morning.",
    intro:    "Ready to write something for Landscapio.",
    prompt:   "Tell me — are we writing a",
    closing:  "Or just tell me what's on your mind",
    inputPrefix: "Write about",
    inputPlaceholder: "anything at all...",
  },

  privacy: {
    noindex: true,
    robotsTxt: true,
  },
};
