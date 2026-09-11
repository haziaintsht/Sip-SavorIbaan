-- ============================================================
-- Make menu_items branch-aware with tiered pricing, then seed it
-- with the real Palindan + Uptown menus (previously hardcoded in
-- data/menu.ts) so the public /menu page can read from Supabase
-- instead of a static file.
--
-- Pricing model:
--   price         -> flat price, OR the "S" (small) tier when
--                    price_medium/price_large are also set
--   price_medium  -> "M" tier (nullable)
--   price_large   -> "L" tier (nullable)
--   price_note    -> free-form override for anything that doesn't
--                    fit the tier model (e.g. "₱999 / ₱1,799",
--                    "+₱20", "₱180 (L)") — takes precedence over
--                    the numeric columns for display when set.
-- ============================================================

alter table public.menu_items
  alter column price drop not null;

alter table public.menu_items
  add column if not exists branch text not null default 'Palindan' check (branch in ('Palindan', 'Uptown')),
  add column if not exists price_medium numeric(10, 2),
  add column if not exists price_large numeric(10, 2),
  add column if not exists price_note text,
  add column if not exists sort_order integer not null default 0;

alter table public.menu_items
  alter column branch drop default;

create index if not exists menu_items_branch_idx on public.menu_items (branch);

-- ============================================================
-- Seed data (replaces the placeholder rows from 001_init.sql)
-- ============================================================

delete from public.menu_items;

insert into public.menu_items
  (branch, name, description, category, price, price_medium, price_large, price_note, is_hidden, is_available, image_url, sort_order)
values
  ('Palindan', 'Bacon Cheesy Fries', null, 'Appetizers', 99, null, null, null, false, true, null, 1),
  ('Palindan', 'Mega Fries', null, 'Appetizers', 249, null, null, null, false, true, null, 2),
  ('Palindan', 'Chicharon Bulaklak Platter', null, 'Appetizers', 170, null, null, null, false, true, null, 3),
  ('Palindan', 'Crispy Spam Sticks', null, 'Appetizers', 160, null, null, null, false, true, null, 4),
  ('Palindan', 'Chix and Fries', null, 'Appetizers', 149, null, null, null, false, true, null, 5),
  ('Palindan', 'Pork Sisig Platter', null, 'Appetizers', 170, null, null, null, false, true, null, 6),
  ('Palindan', 'Onion Rings', null, 'Appetizers', 160, null, null, null, false, true, null, 7),
  ('Palindan', 'Tofu Sisig Platter', null, 'Appetizers', 160, null, null, null, false, true, null, 8),
  ('Palindan', 'Nachos Salad', null, 'Appetizers', 299, null, null, null, false, true, null, 9),
  ('Palindan', 'Chicken Fingers (with rice)', 'Choose a flavor: Cajun BBQ, Cheesy, Garlic Parmesan, Teriyaki, or Sweet Chili 🌶', 'Chicken Fingers', 109, null, null, null, false, true, null, 10),
  ('Palindan', 'Chicken Drummets — Solo with Rice', 'Choose a flavor: Buffalo 🌶, Pesto, Honey Sriracha 🌶, Creamy Salted Egg, Strawberry, or Korean Sweet and Spicy 🌶', 'Chicken Drummets', 149, null, null, null, false, true, null, 11),
  ('Palindan', 'Chicken Drummets — For Sharing', 'Choose a flavor: Buffalo 🌶, Pesto, Honey Sriracha 🌶, Creamy Salted Egg, Strawberry, or Korean Sweet and Spicy 🌶', 'Chicken Drummets', 269, null, null, null, false, true, null, 12),
  ('Palindan', 'Chicken Ala King', null, 'Rice Meals', 159, null, null, null, false, true, null, 13),
  ('Palindan', 'Chicken Pastil', null, 'Rice Meals', 99, null, null, null, false, true, null, 14),
  ('Palindan', 'Chicharon Bulaklak Meal', null, 'Rice Meals', 149, null, null, null, false, true, null, 15),
  ('Palindan', 'Crispy Pork Kare Kare', null, 'Rice Meals', 195, null, null, null, false, true, null, 16),
  ('Palindan', 'Fried Tofu Kare Kare', null, 'Rice Meals', 190, null, null, null, false, true, null, 17),
  ('Palindan', 'Hungarian Sausage', null, 'Rice Meals', 130, null, null, null, false, true, null, 18),
  ('Palindan', 'Pork Bagnet', null, 'Rice Meals', 149, null, null, null, false, true, null, 19),
  ('Palindan', 'Pork Sisig', null, 'Rice Meals', 149, null, null, null, false, true, null, 20),
  ('Palindan', 'Chicken Fingers Bulaklak Combo', null, 'Combo Meals', 199, null, null, null, false, true, null, 21),
  ('Palindan', 'Chicken Fingers Pork Sisig Combo', null, 'Combo Meals', 199, null, null, null, false, true, null, 22),
  ('Palindan', 'Chicken Pepper Mushroom', null, 'Specials', 209, null, null, null, false, true, null, 23),
  ('Palindan', 'Crispy Pork Bagoong Rice', null, 'Specials', 249, null, null, null, false, true, null, 24),
  ('Palindan', 'Sweet and Sour Chicken', null, 'Specials', 209, null, null, null, false, true, null, 25),
  ('Palindan', 'Ultimate Chicken Ala King', null, 'Specials', 249, null, null, null, false, true, null, 26),
  ('Palindan', 'Affogato', 'A perfect scoop meets double shot of espresso.', 'May Kape', 129, null, null, null, false, true, null, 27),
  ('Palindan', 'Barista Drink', 'Bold espresso layered with sweet condensed milk and silky brew, a creamy indulgence in every sip.', 'May Kape', 160, null, null, null, false, true, '/menu/palindan/barista-drink.jpg', 28),
  ('Palindan', 'Biscoffee', 'A bold shot of espresso blended with velvety milk, layered with the warm, spiced sweetness of Biscoff for a cozy, cookie-inspired indulgence.', 'May Kape', 160, null, null, null, false, true, '/menu/palindan/biscoffee.jpg', 29),
  ('Palindan', 'Blueberry Latte', 'A refreshing fusion of juicy blueberry and bold espresso, perfectly balanced with chilled milk.', 'May Kape', 160, null, null, null, false, true, '/menu/palindan/blueberry-latte.jpg', 30),
  ('Palindan', 'Burnt Sugar Oatmilk Latte', 'Espresso, brown sugar, and oat milk, finished with a hint of cinnamon. Cozy, creamy, and dairy-free.', 'May Kape', 160, null, null, null, false, true, '/menu/palindan/burnt-sugar-oatmilk-latte.jpg', 31),
  ('Palindan', 'Dirty Chai Latte', 'A rich blend of espresso and chai, gently spiced with cinnamon for a comforting cup full of warmth and energy.', 'May Kape', 149, null, null, null, false, true, '/menu/palindan/dirty-chai-latte.jpg', 32),
  ('Palindan', 'Egg Yolk Coffee', 'Bold espresso whipped together with creamy egg yolk, creating a silky, velvety cup with a natural sweetness.', 'May Kape', 160, null, null, null, false, true, '/menu/palindan/egg-yolk-coffee.jpg', 33),
  ('Palindan', 'Matcha & Espresso Brew', 'Earthy matcha fused with bold espresso and creamy milk for a rich, energizing blend.', 'May Kape', 149, null, null, null, false, true, '/menu/palindan/matcha-espresso-brew.jpg', 34),
  ('Palindan', 'Salted Caramel Coffee Jelly', 'A refreshing iced coffee topped with smooth coffee jelly cubes.', 'May Kape', 160, null, null, null, false, true, '/menu/palindan/salted-caramel-coffee-jelly.jpg', 35),
  ('Palindan', 'Biscoff Bliss', 'Creamy milk with Biscoff''s caramelized sweetness.', 'Walang Kape', 160, null, null, null, false, true, '/menu/palindan/biscoff-bliss.jpg', 36),
  ('Palindan', 'Hibiscus Tea with Strawberry Pearls', 'Refreshing hibiscus tea paired with juicy strawberry pearls for a vibrant, fruity sip with every pop.', 'Walang Kape', 160, null, null, null, false, true, '/menu/palindan/hibiscus-tea-strawberry-pearls.jpg', 37),
  ('Palindan', 'Kiwi Lemonade', 'A zesty blend of tangy kiwi and refreshing lemonade, served chilled for the perfect burst of freshness.', 'Walang Kape', 160, null, null, null, false, true, '/menu/palindan/kiwi-lemonade.jpg', 38),
  ('Palindan', 'London Fog Latte', 'Earl Grey and vanilla, smooth and creamy.', 'Walang Kape', 149, null, null, null, false, true, '/menu/palindan/london-fog-latte.jpg', 39),
  ('Palindan', 'Mango Cream Matcha', 'Smooth matcha paired with luscious mango cream for a tropical twist on a classic favorite.', 'Walang Kape', 160, null, null, null, false, true, '/menu/palindan/mango-cream-matcha.jpg', 40),
  ('Palindan', 'Midnight Sun', 'A vibrant blend of tropical dragonfruit and sweet pineapple.', 'Walang Kape', 160, null, null, null, false, true, '/menu/palindan/midnight-sun.jpg', 41),
  ('Palindan', 'Oreo Matcha', 'Smooth matcha layered with crunchy Oreo, a creamy fusion of earthy, sweet, and indulgent flavors.', 'Walang Kape', 160, null, null, null, false, true, '/menu/palindan/oreo-matcha.jpg', 42),
  ('Palindan', 'Strawberry Cream Matcha', 'Earthy matcha over chilled milk, topped with sweet strawberry cream for a refreshing layered treat.', 'Walang Kape', 160, null, null, null, false, true, '/menu/palindan/strawberry-cream-matcha.jpg', 43),
  ('Palindan', 'Cafe Americano', null, 'Klassics — Coffee Based', null, 109, 149, null, false, true, null, 44),
  ('Palindan', 'Cafe Latte', null, 'Klassics — Coffee Based', null, 109, 149, null, false, true, null, 45),
  ('Palindan', 'Cafe Mocha', null, 'Klassics — Coffee Based', null, 109, 149, null, false, true, null, 46),
  ('Palindan', 'Caramel Macchiato', null, 'Klassics — Coffee Based', null, 109, 149, null, false, true, null, 47),
  ('Palindan', 'French Vanilla', null, 'Klassics — Coffee Based', null, 109, 149, null, false, true, null, 48),
  ('Palindan', 'Hazelnut Mocha Macchiato', null, 'Klassics — Coffee Based', null, 109, 149, null, false, true, null, 49),
  ('Palindan', 'Salted Caramel', null, 'Klassics — Coffee Based', null, 109, 149, null, false, true, null, 50),
  ('Palindan', 'Spanish Latte', null, 'Klassics — Coffee Based', null, 109, 149, null, false, true, null, 51),
  ('Palindan', 'Blueberry Bliss', null, 'Klassics — Non-Coffee Based', null, 109, 149, null, false, true, null, 52),
  ('Palindan', 'OG Matcha', null, 'Klassics — Non-Coffee Based', null, 109, 149, null, false, true, null, 53),
  ('Palindan', 'Oreo Bliss', null, 'Klassics — Non-Coffee Based', null, 109, 149, null, false, true, null, 54),
  ('Palindan', 'Strawberry Bliss', null, 'Klassics — Non-Coffee Based', null, 109, 149, null, false, true, null, 55),
  ('Palindan', 'Pineapple Juice', null, 'Klassics — Non-Coffee Based', null, 109, 149, null, false, true, null, 56),
  ('Palindan', 'Chamomile Tea', null, 'Teas', 109, null, null, null, false, true, null, 57),
  ('Palindan', 'Earl Grey Tea', null, 'Teas', 109, null, null, null, false, true, null, 58),
  ('Palindan', 'English Breakfast Tea', null, 'Teas', 109, null, null, null, false, true, null, 59),
  ('Palindan', 'Hibiscus Tea', null, 'Teas', 109, null, null, null, false, true, null, 60),
  ('Uptown', 'Signature Glazed Chicken', '5 pcs + 1 rice + pickled radish. Choose a glaze: Honey Garlic, Korean Sweet & Spicy, Pesto Salted Egg, Strawberry, Cajun BBQ, Teriyaki, Classic, Buffalo.', 'Mini Drumsticks / Signature Glazed Chicken', 169, null, null, null, false, true, null, 1),
  ('Uptown', 'Mini Bucket', '9 pcs', 'Mini Drumsticks / Signature Glazed Chicken', 299, null, null, null, false, true, null, 2),
  ('Uptown', 'Big Bucket', '30 pcs / 60 pcs', 'Mini Drumsticks / Signature Glazed Chicken', null, null, null, '₱999 / ₱1,799', false, true, null, 3),
  ('Uptown', 'Cheesy Nachos', null, 'Merienda', 179, null, null, null, false, true, null, 4),
  ('Uptown', 'Ube Grilled Cheese', null, 'Merienda', 169, null, null, null, false, true, null, 5),
  ('Uptown', 'Bacon Cheesy Fries', null, 'Merienda', 169, null, null, null, false, true, null, 6),
  ('Uptown', 'Turon Ala Mode', null, 'Merienda', 169, null, null, null, false, true, null, 7),
  ('Uptown', 'Tuna Pesto Cheesy Melt', null, 'Merienda', 169, null, null, null, false, true, null, 8),
  ('Uptown', 'Chicken Fillet Ala King', null, 'Rice Meals', 180, null, null, null, false, true, null, 9),
  ('Uptown', 'Chicken Pastil', null, 'Rice Meals', 169, null, null, null, false, true, null, 10),
  ('Uptown', 'Fried Chicken Sisig', null, 'Rice Meals', 169, null, null, null, false, true, null, 11),
  ('Uptown', 'Truffle Parmesan Chicken Fillet', null, 'Rice Meals', 180, null, null, null, false, true, null, 12),
  ('Uptown', 'Hungarian Sausage', null, 'Rice Meals', 169, null, null, null, false, true, null, 13),
  ('Uptown', 'Crispy Pork Sisig', null, 'Rice Meals', 169, null, null, null, false, true, null, 14),
  ('Uptown', 'Sweet Chili Mango Fish Fillet', null, 'Rice Meals', 249, null, null, null, false, true, null, 15),
  ('Uptown', 'Brewed Coffee', 'Hot', 'Coffee-Based Signature Drinks', 89, 99, 129, null, false, true, null, 16),
  ('Uptown', 'Cafe Americano', null, 'Coffee-Based Signature Drinks', 89, 99, 129, null, false, true, null, 17),
  ('Uptown', 'Cafe Latte', null, 'Coffee-Based Signature Drinks', 119, 129, 169, null, false, true, null, 18),
  ('Uptown', 'Cafe Mocha', null, 'Coffee-Based Signature Drinks', 119, 129, 169, null, false, true, null, 19),
  ('Uptown', 'Caramel Macchiato', null, 'Coffee-Based Signature Drinks', 119, 129, 169, null, false, true, null, 20),
  ('Uptown', 'French Vanilla', null, 'Coffee-Based Signature Drinks', 119, 129, 169, null, false, true, null, 21),
  ('Uptown', 'Hazelnut Mocha', null, 'Coffee-Based Signature Drinks', 119, 129, 169, null, false, true, null, 22),
  ('Uptown', 'Salted Caramel', null, 'Coffee-Based Signature Drinks', 119, 129, 169, null, false, true, null, 23),
  ('Uptown', 'Spanish Latte', null, 'Coffee-Based Signature Drinks', 119, 129, 169, null, false, true, null, 24),
  ('Uptown', 'Blueberry Bliss', 'Iced', 'Non-Coffee Signature Drinks', 119, 129, 169, null, false, true, null, 25),
  ('Uptown', 'O.G. Matcha', 'Iced', 'Non-Coffee Signature Drinks', 119, 129, 169, null, false, true, null, 26),
  ('Uptown', 'Oreo Bliss', 'Iced', 'Non-Coffee Signature Drinks', 119, 129, 169, null, false, true, null, 27),
  ('Uptown', 'Pineapple Juice', 'Iced', 'Non-Coffee Signature Drinks', 119, 129, 169, null, false, true, null, 28),
  ('Uptown', 'Strawberry Bliss', 'Iced', 'Non-Coffee Signature Drinks', 119, 129, 169, null, false, true, null, 29),
  ('Uptown', 'Chamomile Tea', null, 'Teas', 89, 109, 159, null, false, true, null, 30),
  ('Uptown', 'English Breakfast Tea', null, 'Teas', 89, 109, 159, null, false, true, null, 31),
  ('Uptown', 'English Breakfast Latte', null, 'Teas', 89, 109, 159, null, false, true, null, 32),
  ('Uptown', 'Wild Berry Tea', null, 'Teas', 89, 109, 159, null, false, true, null, 33),
  ('Uptown', 'Biscoffee Blended', null, 'Blended Beverages', null, null, null, '₱180 (L)', false, true, null, 34),
  ('Uptown', 'Caramel Blended', null, 'Blended Beverages', null, null, null, '₱180 (L)', false, true, null, 35),
  ('Uptown', 'Chocolate Chip Blended', null, 'Blended Beverages', null, null, null, '₱180 (L)', false, true, null, 36),
  ('Uptown', 'Coffee Jelly Blended', null, 'Blended Beverages', null, null, null, '₱180 (L)', false, true, null, 37),
  ('Uptown', 'Dipping Sauce', 'Cheese, Garlic Mayo, Spicy Garlic Mayo, or Honey Mustard', 'Extras/Add-ons', null, null, null, '+₱20', false, true, null, 38),
  ('Uptown', 'Ube Latte', 'Silky ube and milk topped with an espresso shot', 'Secret Menu', 179, null, null, null, true, true, null, 39),
  ('Uptown', 'Yakult Espresso', 'Espresso fused with Yakult', 'Secret Menu', 179, null, null, null, true, true, null, 40),
  ('Uptown', 'Salted Caramel Coffee Jelly', 'Iced coffee topped with smooth coffee jelly cubes', 'Secret Menu', 179, null, null, null, true, true, null, 41),
  ('Uptown', 'Dirty Matcha', 'Earthy matcha paired with espresso and milk', 'Secret Menu', 179, null, null, null, true, true, null, 42),
  ('Uptown', 'Biscoffe', 'Velvety latte infused with espresso & Biscoff cookie flavor', 'Secret Menu', 179, null, null, null, true, true, null, 43),
  ('Uptown', 'Thai Tea Espresso Fusion', 'Bold espresso with creamy spiced Thai tea', 'Secret Menu', 179, null, null, null, true, true, null, 44),
  ('Uptown', 'Strawberry Coke Espresso', 'Tangy strawberry, fizzy cola, and bold espresso', 'Secret Menu', 179, null, null, null, true, true, null, 45),
  ('Uptown', 'Golden Sunrise', 'Espresso blended with tropical pineapple', 'Secret Menu', 179, null, null, null, true, true, null, 46),
  ('Uptown', 'Strawberry Milk with Pearls', null, 'Secret Menu', 179, null, null, null, true, true, null, 47),
  ('Uptown', 'Milo Dinosaur', 'Secret menu single price', 'Secret Menu', 160, null, null, null, true, true, null, 48),
  ('Uptown', 'Tropical Sunset', 'Sprite iced shaken with passion fruit and strawberry', 'Secret Menu', 179, null, null, null, true, true, null, 49),
  ('Uptown', 'Ube Cloud', 'Creamy ube & milk with light fluffy texture', 'Secret Menu', 170, null, null, null, true, true, null, 50),
  ('Uptown', 'Blueberry Matcha', null, 'Secret Menu', 179, null, null, null, true, true, null, 51),
  ('Uptown', 'Thai Milk Tea', null, 'Secret Menu', 179, null, null, null, true, true, null, 52),
  ('Uptown', 'Biscoff Bliss', null, 'Secret Menu', 179, null, null, null, true, true, null, 53),
  ('Uptown', 'Strawberry Matcha', null, 'Secret Menu', 179, null, null, null, true, true, null, 54);
