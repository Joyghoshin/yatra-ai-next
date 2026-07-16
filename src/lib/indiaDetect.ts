const INDIAN_STATES_AND_UTS = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa",
  "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala",
  "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland",
  "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura",
  "uttar pradesh", "uttarakhand", "west bengal",
  "delhi", "jammu and kashmir", "ladakh", "puducherry", "chandigarh",
  "andaman and nicobar", "lakshadweep", "dadra and nagar haveli",
];

const MAJOR_INDIAN_CITIES = [
  "mumbai", "delhi", "bengaluru", "bangalore", "hyderabad", "ahmedabad", "chennai",
  "kolkata", "surat", "pune", "jaipur", "lucknow", "kanpur", "nagpur", "indore",
  "thane", "bhopal", "visakhapatnam", "patna", "vadodara", "ghaziabad", "ludhiana",
  "agra", "nashik", "faridabad", "meerut", "rajkot", "varanasi", "srinagar",
  "amritsar", "prayagraj", "allahabad", "ranchi", "coimbatore", "jabalpur",
  "gwalior", "vijayawada", "jodhpur", "raipur", "kota", "guwahati", "chandigarh",
  "mysuru", "mysore", "gurgaon", "gurugram", "noida", "goa", "shimla", "manali",
  "rishikesh", "haridwar", "gaya", "udaipur", "jaisalmer", "pushkar", "darjeeling",
  "ooty", "munnar", "alleppey", "kochi", "cochin", "mangalore", "hampi", "khajuraho",
  "leh", "dharamshala", "mcleodganj", "puri", "bodh gaya", "ajanta", "ellora",
];

const INDIA_KEYWORDS = ["india", "bharat"];

export function detectMode(destination: string): "india" | "international" {
  const normalized = destination.toLowerCase().trim();
  if (!normalized) return "india"; // harmless default while the field is still empty

  const allIndianTerms = [...INDIA_KEYWORDS, ...INDIAN_STATES_AND_UTS, ...MAJOR_INDIAN_CITIES];
  const isIndia = allIndianTerms.some((term) => normalized.includes(term));

  return isIndia ? "india" : "international";
}