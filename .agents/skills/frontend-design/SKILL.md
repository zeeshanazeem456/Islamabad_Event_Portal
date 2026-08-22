---
name: frontend-design
description: >-
  Use this skill when the user asks to improve the UI/UX, design a new web interface, 
  or make the frontend look more appealing, modern, and premium.
---

# Frontend Design Skill

This skill provides a runbook and guidelines for designing high-quality, premium frontend user interfaces.

## Core Design Principles
1. **Modern Aesthetics**: Use sleek dark/light modes, subtle gradients, and glassmorphism where appropriate. Avoid basic, flat primary colors.
2. **Typography**: Always use modern sans-serif fonts (e.g., Inter, Outfit, Roboto) with varied font weights to establish visual hierarchy.
3. **Spacing & Alignment**: Use consistent padding/margins and Flexbox/Grid for perfect alignment. Never use arbitrary pixel pushing.
4. **Micro-Interactions**: Add subtle transition effects (e.g., `transition: all 0.2s ease`) on hover states for interactive elements like buttons and cards.

## Runbook: How to Design or Refactor a UI Component

When asked to design or improve a frontend component, follow these steps:

1. **Analyze Structure**: Identify the necessary HTML semantic tags.
2. **Setup Base Layout**: Apply Flexbox or Grid for proper alignment and spacing. Add rounded corners (e.g., `border-radius: 8px` to `16px`).
3. **Apply Premium Styling**: 
   - Use semi-transparent borders: `border: 1px solid rgba(255,255,255,0.08);`
   - Use soft background gradients for depth: `background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));`
   - Apply subtle box-shadows to elevate elements.
4. **Add Interactivity**: Ensure every clickable element has a `:hover` and `:active` state. 
5. **Ensure Responsiveness**: Verify that the design collapses gracefully on mobile devices using `@media` queries.
