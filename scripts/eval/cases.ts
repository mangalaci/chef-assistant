// Evaluation set for retrieval. `query` is what the chat model sends to
// searchRecipes (English), `question` the user's Hungarian original.
// `relevant` lists the recipe files that genuinely answer the question,
// checked against the ingredient lists in data/recipes.

export type RetrievalCase = {
  id: string;
  question: string;
  query: string;
  relevant: string[];
  required?: boolean; // one of the five questions from the assignment
};

export const POSITIVE_CASES: RetrievalCase[] = [
  {
    id: 'chicken-breast', required: true,
    question: 'Mit főzhetek, ha van otthon csirkemellfilém?', query: 'chicken breast',
    relevant: ['chicken-schnitzel', 'chicken-nuggets', 'halal-cart-chicken', 'teriyaki-chicken', 'creamy-chicken-enchiladas', 'larb-gai'],
  },
  {
    id: 'tofu', question: 'Mit készíthetek tofuból?', query: 'tofu stir fry',
    relevant: ['sesame-tofu', 'sichuan-three-pepper-tofu', 'phat-phrik-khing', 'pad-thai'],
  },
  {
    id: 'flour-eggs', question: 'Mit süthetek lisztből és tojásból?', query: 'what can I make with flour and eggs',
    relevant: ['diner-style-pancakes', 'homemade-pasta', 'soft-pretzels-1', 'soft-pretzels-2', 'samosa-pie', 'chicken-schnitzel'],
  },
  {
    id: 'hot-sauce', question: 'Hogyan készítsek házi csípős szószt?', query: 'homemade hot sauce',
    relevant: ['burning-bike-hot-sauce', 'harissa-hot-sauce', 'jalepeño-hot-sauce', 'portuguese-hot-sauce', 'yemeni-hot-sauce'],
  },
  {
    id: 'pizza', question: 'Hogyan készül a pizzatészta?', query: 'pizza dough',
    relevant: ['pizza-dough', 'no-knead-pan-pizza', 'thin-crust-pizza'],
  },
  {
    id: 'lentils', question: 'Van lencsés recepted?', query: 'lentil dish',
    relevant: ['tarka-dal', 'vada'],
  },
  {
    id: 'chickpeas', question: 'Mit főzzek csicseriborsóból?', query: 'chickpeas',
    relevant: ['channa-masala', 'hummus'],
  },
  {
    id: 'thai-noodles', question: 'Szeretnék thai tésztát főzni.', query: 'Thai stir-fried noodles',
    relevant: ['pad-thai', 'pad-see-ew'],
  },
  {
    id: 'salsa', question: 'Milyen salsát készíthetek tacóhoz?', query: 'salsa for tacos',
    relevant: ['tomatillo-salsa', 'smoky-three-chile-salsa', 'toasted-guajillo-salsa', 'salsa-amarilla'],
  },
  {
    id: 'smoked', question: 'Mit tudok füstölőben készíteni?', query: 'smoked meat in a smoker',
    relevant: ['smoked-pork-shoulder', 'smoked-whole-turkey'],
  },
  {
    id: 'bread', question: 'Milyen házi kenyeret süthetek?', query: 'homemade bread baking',
    relevant: ['pita-bread', 'bagels', 'soft-pretzels-1', 'soft-pretzels-2', 'flour-tortillas', 'roti'],
  },
  {
    id: 'potato-curry', question: 'Van krumplis indiai curry?', query: 'Indian potato curry',
    relevant: ['aloo-matar'],
  },
];

// Nothing in the collection answers these: the system must say so.
export const NEGATIVE_CASES = [
  { id: 'chocolate', required: true, question: 'Milyen édességet tudok csinálni csokival?', query: 'chocolate dessert' },
  { id: 'carbonara', required: true, question: 'Hogyan készítsek carbonarát?', query: 'spaghetti carbonara' },
  { id: 'sushi', question: 'Hogyan készítsek sushit?', query: 'sushi rolls' },
];
