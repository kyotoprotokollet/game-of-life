<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Vue.js Preferences
- Use the Composition API for all Vue components.
- Component names should be in PascalCase.

## JavaScript Style
- Do not use semicolons at the end of statements.
- Variable and function names should be in camelCase.
- Write clean, idiomatic JavaScript.
- Utilize modern JavaScript features (e.g., `map`, `filter`, `reduce`, arrow functions, destructuring, async/await) where appropriate, favoring built-in functionality over external libraries for common tasks.

## Coding Style & Philosophy
- Strive for clean and idiomatic code.
- Emphasize modularity and reusability in your code.
- For general style inspiration, consider the principles often found in the Laravel framework (e.g., clarity, expressiveness).
- Avoid unnecessary comments. Code should be self-documenting through clear variable and function names, and logical structure.
- Only add comments to explain complex logic or non-obvious decisions.

## CSS/Styling Preferences
- Use Tailwind CSS for styling (v4 practices).
- Utilize square bracket notation for arbitrary values when Tailwind's default utility classes are insufficient.
- Prefer configuring Tailwind directly in CSS using `@theme` for theme values and `@utility` for custom utilities.
- Avoid using `@apply` where possible. Prefer composing utility classes directly in the markup.
