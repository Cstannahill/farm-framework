import type { Platform, DeployRecipe } from "@farm-framework/types";
import { RailwayRecipe } from "./railway/railway-recipe.js";
import { FlyRecipe } from "./fly/fly-recipe.js";
import { VercelRecipe } from "./vercel/vercel-recipe.js";

/**
 * Registry for deployment recipes
 */
export class RecipeRegistry {
  private static recipes = new Map<Platform, DeployRecipe>();

  /**
   * Initialize the registry with default recipes
   */
  static initialize(): void {
    this.register(new RailwayRecipe());
    this.register(new FlyRecipe());
    this.register(new VercelRecipe());
  }

  /**
   * Register a new recipe
   */
  static register(recipe: DeployRecipe): void {
    this.recipes.set(recipe.name, recipe);
  }

  /**
   * Get a recipe by platform name
   */
  static getRecipe(platform: Platform): DeployRecipe | undefined {
    if (this.recipes.size === 0) {
      this.initialize();
    }
    return this.recipes.get(platform);
  }

  /**
   * Get all registered recipes
   */
  static getAllRecipes(): DeployRecipe[] {
    if (this.recipes.size === 0) {
      this.initialize();
    }
    return Array.from(this.recipes.values());
  }

  /**
   * Check if a platform is supported
   */
  static isSupported(platform: Platform): boolean {
    if (this.recipes.size === 0) {
      this.initialize();
    }
    return this.recipes.has(platform);
  }

  /**
   * Get list of supported platforms
   */
  static getSupportedPlatforms(): Platform[] {
    if (this.recipes.size === 0) {
      this.initialize();
    }
    return Array.from(this.recipes.keys());
  }
}
