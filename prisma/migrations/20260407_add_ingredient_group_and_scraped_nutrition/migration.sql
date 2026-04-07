-- Add ingredient section heading (group) to RecipeIngredient
ALTER TABLE "RecipeIngredient" ADD COLUMN "group" TEXT;

-- Add scraped nutrition fields to Recipe
ALTER TABLE "Recipe" ADD COLUMN "scrapedCalories"    INTEGER;
ALTER TABLE "Recipe" ADD COLUMN "scrapedProteinG"    DOUBLE PRECISION;
ALTER TABLE "Recipe" ADD COLUMN "scrapedCarbsG"      DOUBLE PRECISION;
ALTER TABLE "Recipe" ADD COLUMN "scrapedFatG"        DOUBLE PRECISION;
ALTER TABLE "Recipe" ADD COLUMN "scrapedFiberG"      DOUBLE PRECISION;
ALTER TABLE "Recipe" ADD COLUMN "scrapedServingSize" TEXT;
