# Two Teams Lunch Catering Demo

This demo showcases a real-world scenario where two distinct teams at a corporate catering event need to collect lunch orders from their team members. Each team has its own branding (logo and CSS theme) while using the same underlying food choice data.

## Scenario
**Corporate Event:** Joint lunch for two company teams
**Coordinators:** One person from each team collecting orders
**Data:** Same food options, different presentation/branding

## Teams

### Team Alpha - Tech Innovators 🔵
- **Theme:** Modern blue technology theme
- **Logo:** Circular blue gradient with "A" symbol
- **CSS:** Clean, modern design with blue gradients
- **Font:** Segoe UI (modern, tech-focused)
- **Target:** Technology-focused team with clean, professional aesthetic

### Team Beta - Green Gardens Co 🌿  
- **Theme:** Nature-inspired green theme
- **Logo:** Leaf-shaped gradient with "β" symbol  
- **CSS:** Organic design with green gradients and nature motifs
- **Font:** Georgia serif (traditional, organic feel)
- **Target:** Environmentally-conscious team with sustainable focus

## Shared Data Structure

Both surveys use the same lookup data for consistency:

### Food Categories
- **Sandwiches:** 10 varieties (Turkey & Swiss, Ham & Cheddar, Italian Sub, etc.)
- **Bread Types:** 8 options (White, Wheat, Sourdough, Ciabatta, etc.)
- **Condiments:** 9 choices (Mayo, Mustard, Ranch, Hummus, etc.)
- **Chips:** 8 varieties (Classic, BBQ, Baked, Pretzels, etc.)
- **Beverages:** 10 options (Water, Coke, Coffee, Lemonade, etc.)
- **Desserts:** 6 choices (Brownies, Cookies, Fruit, Cheesecake, etc.)

## Survey Features

### Data Collection
- Team coordinator information
- Event date and delivery location
- Total headcount and dietary restrictions
- Quantity-based ordering (matrix dropdowns)
- Special requests and contact information

### Technical Features
- **Multi-tenant theming:** Same survey structure, different branding
- **Dynamic lookups:** Shared food choice data
- **Progress tracking:** Visual progress bar
- **Responsive design:** Works on mobile and desktop
- **Custom completion pages:** Team-specific thank you messages

## Setup Instructions

### 1. Upload Assets
Upload the team-specific assets to your survey platform:

**Team Alpha:**
- Logo: `assets/team-alpha/team-alpha-logo.svg`
- CSS: `assets/team-alpha/team-alpha-theme.css`

**Team Beta:**  
- Logo: `assets/team-beta/team-beta-logo.svg`
- CSS: `assets/team-beta/team-beta-theme.css`

### 2. Import Lookup Data
Import the shared CSV lookup files:
- `lookups/sandwich-types.csv`
- `lookups/bread-types.csv` 
- `lookups/condiments.csv`
- `lookups/chips.csv`
- `lookups/beverages.csv`
- `lookups/desserts.csv`

### 3. Create Surveys
Import the survey JSON files:
- `team-alpha-lunch-survey.json` 
- `team-beta-lunch-survey.json`

Update the asset and lookup URLs in the JSON to match your tenant/namespace structure.

## Expected Outcome

When complete, you'll have two visually distinct surveys that:
1. **Look completely different** (blue tech theme vs green nature theme)
2. **Collect the same data structure** (same food choices and quantities)
3. **Share lookup data** (consistent food options across teams)
4. **Provide team-specific experiences** (different logos, colors, fonts, completion messages)

This demonstrates the power of multi-tenant theming while maintaining data consistency across different user groups at the same event.

## Demo Use Cases

This pattern is perfect for:
- **Corporate events** with multiple departments
- **Conference catering** with different sponsor groups  
- **Wedding planning** with bride/groom family coordination
- **School events** with different grade levels or classes
- **Sports tournaments** with multiple team coordination

The coordinator from each team can fill out "their" survey while the caterer gets consistent, structured data for fulfillment.