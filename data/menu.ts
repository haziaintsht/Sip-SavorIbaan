export type MenuItem = {
  name: string;
  description?: string;
  price: string; // formatted, since many items have S/M/L tiers
  category: string;
  hidden?: boolean;
};

export const categories = [
  "Mini Drumsticks / Signature Glazed Chicken",
  "Merienda",
  "Rice Meals",
  "Coffee-Based Signature Drinks",
  "Non-Coffee Signature Drinks",
  "Teas",
  "Blended Beverages",
  "Extras/Add-ons",
] as const;

export const menuItems: MenuItem[] = [
  // Mini Drumsticks & Signature Glazed Chicken
  { name: "Signature Glazed Chicken", description: "5 pcs + 1 rice + pickled radish. Choose a glaze: Honey Garlic, Korean Sweet & Spicy, Pesto Salted Egg, Strawberry, Cajun BBQ, Teriyaki, Classic, Buffalo.", price: "₱169", category: "Mini Drumsticks / Signature Glazed Chicken" },
  { name: "Mini Bucket", description: "9 pcs", price: "₱299", category: "Mini Drumsticks / Signature Glazed Chicken" },
  { name: "Big Bucket", description: "30 pcs / 60 pcs", price: "₱999 / ₱1,799", category: "Mini Drumsticks / Signature Glazed Chicken" },
  { name: "Dipping Sauce", description: "Cheese, Garlic Mayo, Spicy Garlic Mayo, or Honey Mustard", price: "+₱20", category: "Extras/Add-ons" },

  // Merienda
  { name: "Cheesy Nachos", price: "₱179", category: "Merienda" },
  { name: "Ube Grilled Cheese", price: "₱169", category: "Merienda" },
  { name: "Bacon Cheesy Fries", price: "₱169", category: "Merienda" },
  { name: "Turon Ala Mode", price: "₱169", category: "Merienda" },
  { name: "Tuna Pesto Cheesy Melt", price: "₱169", category: "Merienda" },

  // Rice Meals
  { name: "Chicken Fillet Ala King", price: "₱180", category: "Rice Meals" },
  { name: "Chicken Pastil", price: "₱169", category: "Rice Meals" },
  { name: "Fried Chicken Sisig", price: "₱169", category: "Rice Meals" },
  { name: "Truffle Parmesan Chicken Fillet", price: "₱180", category: "Rice Meals" },
  { name: "Hungarian Sausage", price: "₱169", category: "Rice Meals" },
  { name: "Crispy Pork Sisig", price: "₱169", category: "Rice Meals" },
  { name: "Sweet Chili Mango Fish Fillet", price: "₱249", category: "Rice Meals" },

  // Coffee-Based
  { name: "Brewed Coffee", description: "Hot", price: "S ₱89 · M ₱99 · L ₱129", category: "Coffee-Based Signature Drinks" },
  { name: "Cafe Americano", price: "S ₱89 · M ₱99 · L ₱129", category: "Coffee-Based Signature Drinks" },
  { name: "Cafe Latte", price: "S ₱119 · M ₱129 · L ₱169", category: "Coffee-Based Signature Drinks" },
  { name: "Cafe Mocha", price: "S ₱119 · M ₱129 · L ₱169", category: "Coffee-Based Signature Drinks" },
  { name: "Caramel Macchiato", price: "S ₱119 · M ₱129 · L ₱169", category: "Coffee-Based Signature Drinks" },
  { name: "French Vanilla", price: "S ₱119 · M ₱129 · L ₱169", category: "Coffee-Based Signature Drinks" },
  { name: "Hazelnut Mocha", price: "S ₱119 · M ₱129 · L ₱169", category: "Coffee-Based Signature Drinks" },
  { name: "Salted Caramel", price: "S ₱119 · M ₱129 · L ₱169", category: "Coffee-Based Signature Drinks" },
  { name: "Spanish Latte", price: "S ₱119 · M ₱129 · L ₱169", category: "Coffee-Based Signature Drinks" },

  // Blended
  { name: "Biscoffee Blended", price: "₱180 (L)", category: "Blended Beverages" },
  { name: "Caramel Blended", price: "₱180 (L)", category: "Blended Beverages" },
  { name: "Chocolate Chip Blended", price: "₱180 (L)", category: "Blended Beverages" },
  { name: "Coffee Jelly Blended", price: "₱180 (L)", category: "Blended Beverages" },

  // Non-Coffee & Teas
  { name: "Blueberry Bliss", description: "Iced", price: "S ₱119 · M ₱129 · L ₱169", category: "Non-Coffee Signature Drinks" },
  { name: "O.G. Matcha", description: "Iced", price: "S ₱119 · M ₱129 · L ₱169", category: "Non-Coffee Signature Drinks" },
  { name: "Oreo Bliss", description: "Iced", price: "S ₱119 · M ₱129 · L ₱169", category: "Non-Coffee Signature Drinks" },
  { name: "Pineapple Juice", description: "Iced", price: "S ₱119 · M ₱129 · L ₱169", category: "Non-Coffee Signature Drinks" },
  { name: "Strawberry Bliss", description: "Iced", price: "S ₱119 · M ₱129 · L ₱169", category: "Non-Coffee Signature Drinks" },
  { name: "Chamomile Tea", price: "S ₱89 · M ₱109 · L ₱159", category: "Teas" },
  { name: "English Breakfast Tea", price: "S ₱89 · M ₱109 · L ₱159", category: "Teas" },
  { name: "English Breakfast Latte", price: "S ₱89 · M ₱109 · L ₱159", category: "Teas" },
  { name: "Wild Berry Tea", price: "S ₱89 · M ₱109 · L ₱159", category: "Teas" },

  // Hidden / Secret Menu
  { name: "Ube Latte", description: "Silky ube and milk topped with an espresso shot", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Yakult Espresso", description: "Espresso fused with Yakult", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Salted Caramel Coffee Jelly", description: "Iced coffee topped with smooth coffee jelly cubes", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Dirty Matcha", description: "Earthy matcha paired with espresso and milk", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Biscoffe", description: "Velvety latte infused with espresso & Biscoff cookie flavor", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Thai Tea Espresso Fusion", description: "Bold espresso with creamy spiced Thai tea", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Strawberry Coke Espresso", description: "Tangy strawberry, fizzy cola, and bold espresso", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Golden Sunrise", description: "Espresso blended with tropical pineapple", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Strawberry Milk with Pearls", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Milo Dinosaur", description: "Secret menu single price", price: "₱160", category: "Secret Menu", hidden: true },
  { name: "Tropical Sunset", description: "Sprite iced shaken with passion fruit and strawberry", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Ube Cloud", description: "Creamy ube & milk with light fluffy texture", price: "₱170", category: "Secret Menu", hidden: true },
  { name: "Blueberry Matcha", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Thai Milk Tea", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Biscoff Bliss", price: "₱179", category: "Secret Menu", hidden: true },
  { name: "Strawberry Matcha", price: "₱179", category: "Secret Menu", hidden: true },
];
