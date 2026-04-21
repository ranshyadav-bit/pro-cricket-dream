// Real 2024/25 player rosters for international teams and franchise leagues.
// Used to populate scorecards & league sims with authentic names.
// Skill rating (0-100) approximates real-world quality for sim purposes.

import type { Nation, Role } from "./types";

export type RosterPlayer = {
  name: string;
  role: Role;
  rating: number; // 50-95
};

export type LeagueId = "IPL" | "BBL" | "PSL" | "County";

// ---------- INTERNATIONAL SQUADS (Test / ODI / T20I) ----------

type FormatSquads = {
  Test: RosterPlayer[];
  ODI: RosterPlayer[];
  T20I: RosterPlayer[];
};

export const INTERNATIONAL: Record<Nation, FormatSquads> = {
  India: {
    Test: [
      { name: "Rohit Sharma", role: "Top-Order Bat", rating: 88 },
      { name: "Yashasvi Jaiswal", role: "Top-Order Bat", rating: 84 },
      { name: "Shubman Gill", role: "Top-Order Bat", rating: 85 },
      { name: "Virat Kohli", role: "Middle-Order Bat", rating: 90 },
      { name: "KL Rahul", role: "Wicket-Keeper Bat", rating: 82 },
      { name: "Rishabh Pant", role: "Wicket-Keeper Bat", rating: 86 },
      { name: "Ravindra Jadeja", role: "All-Rounder", rating: 87 },
      { name: "Ravichandran Ashwin", role: "Off-Spinner", rating: 89 },
      { name: "Jasprit Bumrah", role: "Pace Bowler", rating: 94 },
      { name: "Mohammed Siraj", role: "Pace Bowler", rating: 84 },
      { name: "Mohammed Shami", role: "Swing Bowler", rating: 86 },
    ],
    ODI: [
      { name: "Rohit Sharma", role: "Top-Order Bat", rating: 90 },
      { name: "Shubman Gill", role: "Top-Order Bat", rating: 87 },
      { name: "Virat Kohli", role: "Middle-Order Bat", rating: 92 },
      { name: "Shreyas Iyer", role: "Middle-Order Bat", rating: 82 },
      { name: "KL Rahul", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Hardik Pandya", role: "All-Rounder", rating: 86 },
      { name: "Ravindra Jadeja", role: "All-Rounder", rating: 85 },
      { name: "Axar Patel", role: "All-Rounder", rating: 80 },
      { name: "Kuldeep Yadav", role: "Leg-Spinner", rating: 84 },
      { name: "Jasprit Bumrah", role: "Pace Bowler", rating: 94 },
      { name: "Mohammed Siraj", role: "Pace Bowler", rating: 85 },
    ],
    T20I: [
      { name: "Rohit Sharma", role: "Top-Order Bat", rating: 88 },
      { name: "Yashasvi Jaiswal", role: "Top-Order Bat", rating: 85 },
      { name: "Suryakumar Yadav", role: "Middle-Order Bat", rating: 90 },
      { name: "Hardik Pandya", role: "All-Rounder", rating: 86 },
      { name: "Rishabh Pant", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Shivam Dube", role: "Finisher", rating: 78 },
      { name: "Ravindra Jadeja", role: "All-Rounder", rating: 84 },
      { name: "Axar Patel", role: "All-Rounder", rating: 80 },
      { name: "Kuldeep Yadav", role: "Leg-Spinner", rating: 84 },
      { name: "Jasprit Bumrah", role: "Pace Bowler", rating: 95 },
      { name: "Arshdeep Singh", role: "Swing Bowler", rating: 82 },
    ],
  },
  Australia: {
    Test: [
      { name: "Usman Khawaja", role: "Top-Order Bat", rating: 84 },
      { name: "Steve Smith", role: "Top-Order Bat", rating: 92 },
      { name: "Marnus Labuschagne", role: "Middle-Order Bat", rating: 86 },
      { name: "Travis Head", role: "Middle-Order Bat", rating: 87 },
      { name: "Cameron Green", role: "All-Rounder", rating: 82 },
      { name: "Alex Carey", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Mitchell Marsh", role: "All-Rounder", rating: 82 },
      { name: "Pat Cummins", role: "Pace Bowler", rating: 92 },
      { name: "Mitchell Starc", role: "Pace Bowler", rating: 89 },
      { name: "Josh Hazlewood", role: "Pace Bowler", rating: 88 },
      { name: "Nathan Lyon", role: "Off-Spinner", rating: 87 },
    ],
    ODI: [
      { name: "Travis Head", role: "Top-Order Bat", rating: 87 },
      { name: "David Warner", role: "Top-Order Bat", rating: 85 },
      { name: "Steve Smith", role: "Middle-Order Bat", rating: 88 },
      { name: "Marnus Labuschagne", role: "Middle-Order Bat", rating: 83 },
      { name: "Glenn Maxwell", role: "All-Rounder", rating: 88 },
      { name: "Marcus Stoinis", role: "All-Rounder", rating: 80 },
      { name: "Josh Inglis", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Pat Cummins", role: "Pace Bowler", rating: 90 },
      { name: "Mitchell Starc", role: "Pace Bowler", rating: 91 },
      { name: "Adam Zampa", role: "Leg-Spinner", rating: 84 },
      { name: "Josh Hazlewood", role: "Pace Bowler", rating: 86 },
    ],
    T20I: [
      { name: "Travis Head", role: "Top-Order Bat", rating: 86 },
      { name: "Mitchell Marsh", role: "Middle-Order Bat", rating: 84 },
      { name: "Glenn Maxwell", role: "All-Rounder", rating: 88 },
      { name: "Tim David", role: "Finisher", rating: 84 },
      { name: "Marcus Stoinis", role: "All-Rounder", rating: 82 },
      { name: "Matthew Wade", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Pat Cummins", role: "Pace Bowler", rating: 88 },
      { name: "Mitchell Starc", role: "Pace Bowler", rating: 90 },
      { name: "Josh Hazlewood", role: "Pace Bowler", rating: 86 },
      { name: "Adam Zampa", role: "Leg-Spinner", rating: 85 },
      { name: "Nathan Ellis", role: "Pace Bowler", rating: 78 },
    ],
  },
  England: {
    Test: [
      { name: "Zak Crawley", role: "Top-Order Bat", rating: 80 },
      { name: "Ben Duckett", role: "Top-Order Bat", rating: 84 },
      { name: "Ollie Pope", role: "Middle-Order Bat", rating: 82 },
      { name: "Joe Root", role: "Middle-Order Bat", rating: 92 },
      { name: "Harry Brook", role: "Middle-Order Bat", rating: 88 },
      { name: "Ben Stokes", role: "All-Rounder", rating: 90 },
      { name: "Jamie Smith", role: "Wicket-Keeper Bat", rating: 78 },
      { name: "Chris Woakes", role: "All-Rounder", rating: 82 },
      { name: "Mark Wood", role: "Pace Bowler", rating: 86 },
      { name: "Shoaib Bashir", role: "Off-Spinner", rating: 75 },
      { name: "Gus Atkinson", role: "Pace Bowler", rating: 80 },
    ],
    ODI: [
      { name: "Phil Salt", role: "Top-Order Bat", rating: 84 },
      { name: "Will Jacks", role: "Top-Order Bat", rating: 80 },
      { name: "Harry Brook", role: "Middle-Order Bat", rating: 86 },
      { name: "Joe Root", role: "Middle-Order Bat", rating: 88 },
      { name: "Jos Buttler", role: "Wicket-Keeper Bat", rating: 88 },
      { name: "Liam Livingstone", role: "All-Rounder", rating: 82 },
      { name: "Sam Curran", role: "All-Rounder", rating: 80 },
      { name: "Adil Rashid", role: "Leg-Spinner", rating: 86 },
      { name: "Jofra Archer", role: "Pace Bowler", rating: 88 },
      { name: "Mark Wood", role: "Pace Bowler", rating: 86 },
      { name: "Brydon Carse", role: "Pace Bowler", rating: 79 },
    ],
    T20I: [
      { name: "Phil Salt", role: "Top-Order Bat", rating: 86 },
      { name: "Jos Buttler", role: "Wicket-Keeper Bat", rating: 90 },
      { name: "Will Jacks", role: "Top-Order Bat", rating: 82 },
      { name: "Harry Brook", role: "Middle-Order Bat", rating: 86 },
      { name: "Liam Livingstone", role: "All-Rounder", rating: 84 },
      { name: "Sam Curran", role: "All-Rounder", rating: 82 },
      { name: "Moeen Ali", role: "All-Rounder", rating: 82 },
      { name: "Adil Rashid", role: "Leg-Spinner", rating: 86 },
      { name: "Jofra Archer", role: "Pace Bowler", rating: 89 },
      { name: "Mark Wood", role: "Pace Bowler", rating: 87 },
      { name: "Reece Topley", role: "Swing Bowler", rating: 80 },
    ],
  },
  Pakistan: {
    Test: [
      { name: "Abdullah Shafique", role: "Top-Order Bat", rating: 80 },
      { name: "Saim Ayub", role: "Top-Order Bat", rating: 78 },
      { name: "Babar Azam", role: "Middle-Order Bat", rating: 90 },
      { name: "Saud Shakeel", role: "Middle-Order Bat", rating: 82 },
      { name: "Mohammad Rizwan", role: "Wicket-Keeper Bat", rating: 86 },
      { name: "Salman Ali Agha", role: "All-Rounder", rating: 78 },
      { name: "Aamir Jamal", role: "All-Rounder", rating: 76 },
      { name: "Shaheen Shah Afridi", role: "Pace Bowler", rating: 90 },
      { name: "Naseem Shah", role: "Pace Bowler", rating: 86 },
      { name: "Abrar Ahmed", role: "Leg-Spinner", rating: 78 },
      { name: "Sajid Khan", role: "Off-Spinner", rating: 76 },
    ],
    ODI: [
      { name: "Saim Ayub", role: "Top-Order Bat", rating: 78 },
      { name: "Babar Azam", role: "Top-Order Bat", rating: 92 },
      { name: "Mohammad Rizwan", role: "Wicket-Keeper Bat", rating: 86 },
      { name: "Salman Ali Agha", role: "All-Rounder", rating: 78 },
      { name: "Iftikhar Ahmed", role: "All-Rounder", rating: 76 },
      { name: "Khushdil Shah", role: "Finisher", rating: 76 },
      { name: "Shadab Khan", role: "Leg-Spinner", rating: 82 },
      { name: "Shaheen Shah Afridi", role: "Pace Bowler", rating: 90 },
      { name: "Naseem Shah", role: "Pace Bowler", rating: 84 },
      { name: "Haris Rauf", role: "Pace Bowler", rating: 84 },
      { name: "Mohammad Wasim Jr", role: "Pace Bowler", rating: 78 },
    ],
    T20I: [
      { name: "Saim Ayub", role: "Top-Order Bat", rating: 80 },
      { name: "Babar Azam", role: "Top-Order Bat", rating: 90 },
      { name: "Mohammad Rizwan", role: "Wicket-Keeper Bat", rating: 88 },
      { name: "Fakhar Zaman", role: "Middle-Order Bat", rating: 82 },
      { name: "Iftikhar Ahmed", role: "All-Rounder", rating: 78 },
      { name: "Shadab Khan", role: "Leg-Spinner", rating: 82 },
      { name: "Imad Wasim", role: "All-Rounder", rating: 78 },
      { name: "Shaheen Shah Afridi", role: "Pace Bowler", rating: 90 },
      { name: "Haris Rauf", role: "Pace Bowler", rating: 86 },
      { name: "Naseem Shah", role: "Pace Bowler", rating: 84 },
      { name: "Abbas Afridi", role: "Pace Bowler", rating: 76 },
    ],
  },
  "South Africa": {
    Test: [
      { name: "Aiden Markram", role: "Top-Order Bat", rating: 84 },
      { name: "Tony de Zorzi", role: "Top-Order Bat", rating: 78 },
      { name: "Temba Bavuma", role: "Middle-Order Bat", rating: 84 },
      { name: "Tristan Stubbs", role: "Middle-Order Bat", rating: 80 },
      { name: "David Bedingham", role: "Middle-Order Bat", rating: 78 },
      { name: "Kyle Verreynne", role: "Wicket-Keeper Bat", rating: 78 },
      { name: "Marco Jansen", role: "All-Rounder", rating: 84 },
      { name: "Kagiso Rabada", role: "Pace Bowler", rating: 92 },
      { name: "Gerald Coetzee", role: "Pace Bowler", rating: 80 },
      { name: "Lungi Ngidi", role: "Pace Bowler", rating: 82 },
      { name: "Keshav Maharaj", role: "Off-Spinner", rating: 84 },
    ],
    ODI: [
      { name: "Quinton de Kock", role: "Wicket-Keeper Bat", rating: 88 },
      { name: "Temba Bavuma", role: "Top-Order Bat", rating: 84 },
      { name: "Aiden Markram", role: "Middle-Order Bat", rating: 84 },
      { name: "Heinrich Klaasen", role: "Wicket-Keeper Bat", rating: 88 },
      { name: "David Miller", role: "Finisher", rating: 86 },
      { name: "Marco Jansen", role: "All-Rounder", rating: 82 },
      { name: "Keshav Maharaj", role: "Off-Spinner", rating: 84 },
      { name: "Kagiso Rabada", role: "Pace Bowler", rating: 92 },
      { name: "Lungi Ngidi", role: "Pace Bowler", rating: 82 },
      { name: "Tabraiz Shamsi", role: "Leg-Spinner", rating: 82 },
      { name: "Gerald Coetzee", role: "Pace Bowler", rating: 80 },
    ],
    T20I: [
      { name: "Quinton de Kock", role: "Wicket-Keeper Bat", rating: 88 },
      { name: "Reeza Hendricks", role: "Top-Order Bat", rating: 80 },
      { name: "Aiden Markram", role: "Middle-Order Bat", rating: 86 },
      { name: "Heinrich Klaasen", role: "Wicket-Keeper Bat", rating: 90 },
      { name: "David Miller", role: "Finisher", rating: 88 },
      { name: "Tristan Stubbs", role: "Middle-Order Bat", rating: 82 },
      { name: "Marco Jansen", role: "All-Rounder", rating: 82 },
      { name: "Keshav Maharaj", role: "Off-Spinner", rating: 82 },
      { name: "Kagiso Rabada", role: "Pace Bowler", rating: 90 },
      { name: "Anrich Nortje", role: "Pace Bowler", rating: 88 },
      { name: "Tabraiz Shamsi", role: "Leg-Spinner", rating: 84 },
    ],
  },
  "New Zealand": {
    Test: [
      { name: "Tom Latham", role: "Top-Order Bat", rating: 84 },
      { name: "Devon Conway", role: "Top-Order Bat", rating: 84 },
      { name: "Kane Williamson", role: "Middle-Order Bat", rating: 92 },
      { name: "Rachin Ravindra", role: "All-Rounder", rating: 84 },
      { name: "Daryl Mitchell", role: "Middle-Order Bat", rating: 84 },
      { name: "Tom Blundell", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Glenn Phillips", role: "All-Rounder", rating: 82 },
      { name: "Mitchell Santner", role: "Off-Spinner", rating: 82 },
      { name: "Tim Southee", role: "Swing Bowler", rating: 86 },
      { name: "Matt Henry", role: "Pace Bowler", rating: 84 },
      { name: "William O'Rourke", role: "Pace Bowler", rating: 80 },
    ],
    ODI: [
      { name: "Devon Conway", role: "Top-Order Bat", rating: 84 },
      { name: "Will Young", role: "Top-Order Bat", rating: 80 },
      { name: "Kane Williamson", role: "Middle-Order Bat", rating: 90 },
      { name: "Daryl Mitchell", role: "Middle-Order Bat", rating: 84 },
      { name: "Tom Latham", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Glenn Phillips", role: "All-Rounder", rating: 84 },
      { name: "Rachin Ravindra", role: "All-Rounder", rating: 84 },
      { name: "Mitchell Santner", role: "Off-Spinner", rating: 84 },
      { name: "Trent Boult", role: "Swing Bowler", rating: 88 },
      { name: "Lockie Ferguson", role: "Pace Bowler", rating: 84 },
      { name: "Matt Henry", role: "Pace Bowler", rating: 84 },
    ],
    T20I: [
      { name: "Finn Allen", role: "Top-Order Bat", rating: 82 },
      { name: "Devon Conway", role: "Top-Order Bat", rating: 84 },
      { name: "Kane Williamson", role: "Middle-Order Bat", rating: 88 },
      { name: "Glenn Phillips", role: "All-Rounder", rating: 86 },
      { name: "Daryl Mitchell", role: "Middle-Order Bat", rating: 84 },
      { name: "Mark Chapman", role: "Finisher", rating: 80 },
      { name: "Mitchell Santner", role: "Off-Spinner", rating: 84 },
      { name: "Ish Sodhi", role: "Leg-Spinner", rating: 82 },
      { name: "Tim Southee", role: "Swing Bowler", rating: 86 },
      { name: "Lockie Ferguson", role: "Pace Bowler", rating: 86 },
      { name: "Trent Boult", role: "Swing Bowler", rating: 88 },
    ],
  },
  "West Indies": {
    Test: [
      { name: "Kraigg Brathwaite", role: "Top-Order Bat", rating: 78 },
      { name: "Mikyle Louis", role: "Top-Order Bat", rating: 72 },
      { name: "Kavem Hodge", role: "Middle-Order Bat", rating: 76 },
      { name: "Alick Athanaze", role: "Middle-Order Bat", rating: 76 },
      { name: "Joshua Da Silva", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Justin Greaves", role: "All-Rounder", rating: 74 },
      { name: "Jason Holder", role: "All-Rounder", rating: 84 },
      { name: "Alzarri Joseph", role: "Pace Bowler", rating: 84 },
      { name: "Kemar Roach", role: "Pace Bowler", rating: 82 },
      { name: "Jayden Seales", role: "Pace Bowler", rating: 78 },
      { name: "Gudakesh Motie", role: "Off-Spinner", rating: 76 },
    ],
    ODI: [
      { name: "Brandon King", role: "Top-Order Bat", rating: 78 },
      { name: "Evin Lewis", role: "Top-Order Bat", rating: 80 },
      { name: "Shai Hope", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Sherfane Rutherford", role: "Finisher", rating: 80 },
      { name: "Roston Chase", role: "All-Rounder", rating: 78 },
      { name: "Romario Shepherd", role: "All-Rounder", rating: 78 },
      { name: "Gudakesh Motie", role: "Off-Spinner", rating: 78 },
      { name: "Akeal Hosein", role: "Off-Spinner", rating: 80 },
      { name: "Alzarri Joseph", role: "Pace Bowler", rating: 84 },
      { name: "Shamar Joseph", role: "Pace Bowler", rating: 80 },
      { name: "Matthew Forde", role: "Pace Bowler", rating: 76 },
    ],
    T20I: [
      { name: "Brandon King", role: "Top-Order Bat", rating: 80 },
      { name: "Johnson Charles", role: "Top-Order Bat", rating: 80 },
      { name: "Nicholas Pooran", role: "Wicket-Keeper Bat", rating: 88 },
      { name: "Shai Hope", role: "Wicket-Keeper Bat", rating: 82 },
      { name: "Sherfane Rutherford", role: "Finisher", rating: 82 },
      { name: "Rovman Powell", role: "Finisher", rating: 80 },
      { name: "Andre Russell", role: "All-Rounder", rating: 88 },
      { name: "Akeal Hosein", role: "Off-Spinner", rating: 80 },
      { name: "Romario Shepherd", role: "All-Rounder", rating: 78 },
      { name: "Alzarri Joseph", role: "Pace Bowler", rating: 84 },
      { name: "Obed McCoy", role: "Pace Bowler", rating: 80 },
    ],
  },
  "Sri Lanka": {
    Test: [
      { name: "Dimuth Karunaratne", role: "Top-Order Bat", rating: 80 },
      { name: "Pathum Nissanka", role: "Top-Order Bat", rating: 82 },
      { name: "Kusal Mendis", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Angelo Mathews", role: "All-Rounder", rating: 84 },
      { name: "Dinesh Chandimal", role: "Middle-Order Bat", rating: 82 },
      { name: "Kamindu Mendis", role: "All-Rounder", rating: 82 },
      { name: "Dhananjaya de Silva", role: "All-Rounder", rating: 80 },
      { name: "Prabath Jayasuriya", role: "Off-Spinner", rating: 84 },
      { name: "Lahiru Kumara", role: "Pace Bowler", rating: 80 },
      { name: "Asitha Fernando", role: "Pace Bowler", rating: 80 },
      { name: "Vishwa Fernando", role: "Pace Bowler", rating: 76 },
    ],
    ODI: [
      { name: "Pathum Nissanka", role: "Top-Order Bat", rating: 84 },
      { name: "Avishka Fernando", role: "Top-Order Bat", rating: 80 },
      { name: "Kusal Mendis", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Charith Asalanka", role: "Middle-Order Bat", rating: 82 },
      { name: "Sadeera Samarawickrama", role: "Middle-Order Bat", rating: 78 },
      { name: "Wanindu Hasaranga", role: "Leg-Spinner", rating: 86 },
      { name: "Maheesh Theekshana", role: "Off-Spinner", rating: 82 },
      { name: "Dunith Wellalage", role: "All-Rounder", rating: 78 },
      { name: "Matheesha Pathirana", role: "Pace Bowler", rating: 84 },
      { name: "Dilshan Madushanka", role: "Pace Bowler", rating: 80 },
      { name: "Asitha Fernando", role: "Pace Bowler", rating: 78 },
    ],
    T20I: [
      { name: "Pathum Nissanka", role: "Top-Order Bat", rating: 84 },
      { name: "Kusal Mendis", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Kusal Perera", role: "Top-Order Bat", rating: 82 },
      { name: "Charith Asalanka", role: "Middle-Order Bat", rating: 82 },
      { name: "Dasun Shanaka", role: "All-Rounder", rating: 78 },
      { name: "Wanindu Hasaranga", role: "Leg-Spinner", rating: 88 },
      { name: "Maheesh Theekshana", role: "Off-Spinner", rating: 82 },
      { name: "Dunith Wellalage", role: "All-Rounder", rating: 76 },
      { name: "Matheesha Pathirana", role: "Pace Bowler", rating: 86 },
      { name: "Nuwan Thushara", role: "Pace Bowler", rating: 80 },
      { name: "Dilshan Madushanka", role: "Pace Bowler", rating: 78 },
    ],
  },
  Bangladesh: {
    Test: [
      { name: "Zakir Hasan", role: "Top-Order Bat", rating: 76 },
      { name: "Shadman Islam", role: "Top-Order Bat", rating: 76 },
      { name: "Najmul Hossain Shanto", role: "Middle-Order Bat", rating: 82 },
      { name: "Mominul Haque", role: "Middle-Order Bat", rating: 80 },
      { name: "Mushfiqur Rahim", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Liton Das", role: "Wicket-Keeper Bat", rating: 82 },
      { name: "Shakib Al Hasan", role: "All-Rounder", rating: 86 },
      { name: "Mehidy Hasan Miraz", role: "All-Rounder", rating: 82 },
      { name: "Taijul Islam", role: "Off-Spinner", rating: 82 },
      { name: "Taskin Ahmed", role: "Pace Bowler", rating: 82 },
      { name: "Hasan Mahmud", role: "Pace Bowler", rating: 78 },
    ],
    ODI: [
      { name: "Tamim Iqbal", role: "Top-Order Bat", rating: 82 },
      { name: "Liton Das", role: "Wicket-Keeper Bat", rating: 82 },
      { name: "Najmul Hossain Shanto", role: "Middle-Order Bat", rating: 82 },
      { name: "Mushfiqur Rahim", role: "Wicket-Keeper Bat", rating: 82 },
      { name: "Towhid Hridoy", role: "Middle-Order Bat", rating: 80 },
      { name: "Mahmudullah", role: "All-Rounder", rating: 78 },
      { name: "Shakib Al Hasan", role: "All-Rounder", rating: 86 },
      { name: "Mehidy Hasan Miraz", role: "All-Rounder", rating: 82 },
      { name: "Taskin Ahmed", role: "Pace Bowler", rating: 82 },
      { name: "Mustafizur Rahman", role: "Pace Bowler", rating: 84 },
      { name: "Shoriful Islam", role: "Pace Bowler", rating: 78 },
    ],
    T20I: [
      { name: "Litton Das", role: "Wicket-Keeper Bat", rating: 82 },
      { name: "Tanzid Hasan", role: "Top-Order Bat", rating: 78 },
      { name: "Najmul Hossain Shanto", role: "Middle-Order Bat", rating: 82 },
      { name: "Towhid Hridoy", role: "Middle-Order Bat", rating: 80 },
      { name: "Mahmudullah", role: "All-Rounder", rating: 78 },
      { name: "Jaker Ali", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Mehidy Hasan Miraz", role: "All-Rounder", rating: 80 },
      { name: "Rishad Hossain", role: "Leg-Spinner", rating: 78 },
      { name: "Taskin Ahmed", role: "Pace Bowler", rating: 84 },
      { name: "Mustafizur Rahman", role: "Pace Bowler", rating: 84 },
      { name: "Shoriful Islam", role: "Pace Bowler", rating: 78 },
    ],
  },
};

// ---------- FRANCHISE LEAGUES ----------

export type LeagueTeam = {
  id: string;
  name: string;
  short: string;
  squad: RosterPlayer[];
};

export const IPL_TEAMS: LeagueTeam[] = [
  {
    id: "mi", name: "Mumbai Indians", short: "MI",
    squad: [
      { name: "Rohit Sharma", role: "Top-Order Bat", rating: 88 },
      { name: "Ishan Kishan", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Suryakumar Yadav", role: "Middle-Order Bat", rating: 88 },
      { name: "Tilak Varma", role: "Middle-Order Bat", rating: 82 },
      { name: "Hardik Pandya", role: "All-Rounder", rating: 86 },
      { name: "Tim David", role: "Finisher", rating: 84 },
      { name: "Naman Dhir", role: "Finisher", rating: 74 },
      { name: "Jasprit Bumrah", role: "Pace Bowler", rating: 95 },
      { name: "Trent Boult", role: "Swing Bowler", rating: 86 },
      { name: "Mitchell Santner", role: "Off-Spinner", rating: 82 },
      { name: "Karn Sharma", role: "Leg-Spinner", rating: 76 },
    ],
  },
  {
    id: "csk", name: "Chennai Super Kings", short: "CSK",
    squad: [
      { name: "Ruturaj Gaikwad", role: "Top-Order Bat", rating: 84 },
      { name: "Rachin Ravindra", role: "All-Rounder", rating: 84 },
      { name: "Devon Conway", role: "Top-Order Bat", rating: 84 },
      { name: "Shivam Dube", role: "Finisher", rating: 80 },
      { name: "MS Dhoni", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Ravindra Jadeja", role: "All-Rounder", rating: 86 },
      { name: "Sam Curran", role: "All-Rounder", rating: 80 },
      { name: "Noor Ahmad", role: "Leg-Spinner", rating: 80 },
      { name: "Matheesha Pathirana", role: "Pace Bowler", rating: 84 },
      { name: "Khaleel Ahmed", role: "Pace Bowler", rating: 78 },
      { name: "Mukesh Choudhary", role: "Pace Bowler", rating: 76 },
    ],
  },
  {
    id: "rcb", name: "Royal Challengers Bengaluru", short: "RCB",
    squad: [
      { name: "Virat Kohli", role: "Top-Order Bat", rating: 92 },
      { name: "Phil Salt", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Rajat Patidar", role: "Middle-Order Bat", rating: 80 },
      { name: "Liam Livingstone", role: "All-Rounder", rating: 82 },
      { name: "Jitesh Sharma", role: "Wicket-Keeper Bat", rating: 78 },
      { name: "Krunal Pandya", role: "All-Rounder", rating: 80 },
      { name: "Tim David", role: "Finisher", rating: 82 },
      { name: "Josh Hazlewood", role: "Pace Bowler", rating: 88 },
      { name: "Bhuvneshwar Kumar", role: "Swing Bowler", rating: 82 },
      { name: "Yash Dayal", role: "Pace Bowler", rating: 76 },
      { name: "Suyash Sharma", role: "Leg-Spinner", rating: 74 },
    ],
  },
  {
    id: "kkr", name: "Kolkata Knight Riders", short: "KKR",
    squad: [
      { name: "Sunil Narine", role: "All-Rounder", rating: 86 },
      { name: "Quinton de Kock", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Ajinkya Rahane", role: "Top-Order Bat", rating: 78 },
      { name: "Venkatesh Iyer", role: "All-Rounder", rating: 80 },
      { name: "Rinku Singh", role: "Finisher", rating: 84 },
      { name: "Andre Russell", role: "All-Rounder", rating: 88 },
      { name: "Ramandeep Singh", role: "Finisher", rating: 76 },
      { name: "Varun Chakaravarthy", role: "Leg-Spinner", rating: 84 },
      { name: "Harshit Rana", role: "Pace Bowler", rating: 78 },
      { name: "Anrich Nortje", role: "Pace Bowler", rating: 86 },
      { name: "Vaibhav Arora", role: "Pace Bowler", rating: 76 },
    ],
  },
  {
    id: "srh", name: "Sunrisers Hyderabad", short: "SRH",
    squad: [
      { name: "Travis Head", role: "Top-Order Bat", rating: 88 },
      { name: "Abhishek Sharma", role: "Top-Order Bat", rating: 82 },
      { name: "Ishan Kishan", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Heinrich Klaasen", role: "Wicket-Keeper Bat", rating: 88 },
      { name: "Nitish Kumar Reddy", role: "All-Rounder", rating: 80 },
      { name: "Aniket Verma", role: "Finisher", rating: 74 },
      { name: "Pat Cummins", role: "Pace Bowler", rating: 88 },
      { name: "Mohammed Shami", role: "Swing Bowler", rating: 84 },
      { name: "Harshal Patel", role: "Pace Bowler", rating: 80 },
      { name: "Rahul Chahar", role: "Leg-Spinner", rating: 78 },
      { name: "Adam Zampa", role: "Leg-Spinner", rating: 82 },
    ],
  },
  {
    id: "dc", name: "Delhi Capitals", short: "DC",
    squad: [
      { name: "Faf du Plessis", role: "Top-Order Bat", rating: 84 },
      { name: "Jake Fraser-McGurk", role: "Top-Order Bat", rating: 82 },
      { name: "KL Rahul", role: "Wicket-Keeper Bat", rating: 86 },
      { name: "Axar Patel", role: "All-Rounder", rating: 82 },
      { name: "Tristan Stubbs", role: "Middle-Order Bat", rating: 80 },
      { name: "Sameer Rizvi", role: "Finisher", rating: 74 },
      { name: "Mitchell Starc", role: "Pace Bowler", rating: 88 },
      { name: "T Natarajan", role: "Pace Bowler", rating: 78 },
      { name: "Kuldeep Yadav", role: "Leg-Spinner", rating: 84 },
      { name: "Mukesh Kumar", role: "Pace Bowler", rating: 76 },
      { name: "Vipraj Nigam", role: "Leg-Spinner", rating: 70 },
    ],
  },
  {
    id: "rr", name: "Rajasthan Royals", short: "RR",
    squad: [
      { name: "Yashasvi Jaiswal", role: "Top-Order Bat", rating: 86 },
      { name: "Sanju Samson", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Riyan Parag", role: "All-Rounder", rating: 80 },
      { name: "Dhruv Jurel", role: "Wicket-Keeper Bat", rating: 78 },
      { name: "Shimron Hetmyer", role: "Finisher", rating: 82 },
      { name: "Nitish Rana", role: "Middle-Order Bat", rating: 78 },
      { name: "Wanindu Hasaranga", role: "Leg-Spinner", rating: 84 },
      { name: "Trent Boult", role: "Swing Bowler", rating: 86 },
      { name: "Jofra Archer", role: "Pace Bowler", rating: 88 },
      { name: "Sandeep Sharma", role: "Swing Bowler", rating: 78 },
      { name: "Maheesh Theekshana", role: "Off-Spinner", rating: 80 },
    ],
  },
  {
    id: "pbks", name: "Punjab Kings", short: "PBKS",
    squad: [
      { name: "Shreyas Iyer", role: "Top-Order Bat", rating: 84 },
      { name: "Prabhsimran Singh", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Josh Inglis", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Glenn Maxwell", role: "All-Rounder", rating: 86 },
      { name: "Marcus Stoinis", role: "All-Rounder", rating: 82 },
      { name: "Shashank Singh", role: "Finisher", rating: 78 },
      { name: "Marco Jansen", role: "All-Rounder", rating: 80 },
      { name: "Arshdeep Singh", role: "Swing Bowler", rating: 82 },
      { name: "Kagiso Rabada", role: "Pace Bowler", rating: 90 },
      { name: "Yuzvendra Chahal", role: "Leg-Spinner", rating: 84 },
      { name: "Harpreet Brar", role: "Off-Spinner", rating: 74 },
    ],
  },
  {
    id: "gt", name: "Gujarat Titans", short: "GT",
    squad: [
      { name: "Shubman Gill", role: "Top-Order Bat", rating: 88 },
      { name: "Sai Sudharsan", role: "Top-Order Bat", rating: 80 },
      { name: "Jos Buttler", role: "Wicket-Keeper Bat", rating: 88 },
      { name: "Glenn Phillips", role: "All-Rounder", rating: 84 },
      { name: "Rahul Tewatia", role: "Finisher", rating: 78 },
      { name: "Shahrukh Khan", role: "Finisher", rating: 76 },
      { name: "Mohammed Siraj", role: "Pace Bowler", rating: 84 },
      { name: "Rashid Khan", role: "Leg-Spinner", rating: 90 },
      { name: "Prasidh Krishna", role: "Pace Bowler", rating: 80 },
      { name: "Kagiso Rabada", role: "Pace Bowler", rating: 88 },
      { name: "Sai Kishore", role: "Off-Spinner", rating: 76 },
    ],
  },
  {
    id: "lsg", name: "Lucknow Super Giants", short: "LSG",
    squad: [
      { name: "Nicholas Pooran", role: "Wicket-Keeper Bat", rating: 86 },
      { name: "David Miller", role: "Finisher", rating: 84 },
      { name: "Mitchell Marsh", role: "All-Rounder", rating: 84 },
      { name: "Aiden Markram", role: "Middle-Order Bat", rating: 84 },
      { name: "Rishabh Pant", role: "Wicket-Keeper Bat", rating: 86 },
      { name: "Ayush Badoni", role: "All-Rounder", rating: 76 },
      { name: "Abdul Samad", role: "Finisher", rating: 76 },
      { name: "Avesh Khan", role: "Pace Bowler", rating: 80 },
      { name: "Mohsin Khan", role: "Pace Bowler", rating: 78 },
      { name: "Ravi Bishnoi", role: "Leg-Spinner", rating: 82 },
      { name: "Shamar Joseph", role: "Pace Bowler", rating: 78 },
    ],
  },
];

export const BBL_TEAMS: LeagueTeam[] = [
  {
    id: "syd-six", name: "Sydney Sixers", short: "SIX",
    squad: [
      { name: "Steve Smith", role: "Top-Order Bat", rating: 86 },
      { name: "Josh Philippe", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Daniel Hughes", role: "Top-Order Bat", rating: 76 },
      { name: "Moises Henriques", role: "All-Rounder", rating: 78 },
      { name: "Jordan Silk", role: "Middle-Order Bat", rating: 76 },
      { name: "James Vince", role: "Top-Order Bat", rating: 80 },
      { name: "Sean Abbott", role: "All-Rounder", rating: 80 },
      { name: "Ben Dwarshuis", role: "Pace Bowler", rating: 78 },
      { name: "Jackson Bird", role: "Pace Bowler", rating: 76 },
      { name: "Steve O'Keefe", role: "Off-Spinner", rating: 78 },
      { name: "Hayden Kerr", role: "All-Rounder", rating: 76 },
    ],
  },
  {
    id: "syd-th", name: "Sydney Thunder", short: "THU",
    squad: [
      { name: "David Warner", role: "Top-Order Bat", rating: 86 },
      { name: "Cameron Bancroft", role: "Top-Order Bat", rating: 76 },
      { name: "Sam Billings", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Daniel Sams", role: "All-Rounder", rating: 80 },
      { name: "Chris Green", role: "All-Rounder", rating: 76 },
      { name: "Oliver Davies", role: "Middle-Order Bat", rating: 74 },
      { name: "Wes Agar", role: "Pace Bowler", rating: 76 },
      { name: "Lockie Ferguson", role: "Pace Bowler", rating: 84 },
      { name: "Tanveer Sangha", role: "Leg-Spinner", rating: 78 },
      { name: "Nathan McAndrew", role: "Pace Bowler", rating: 74 },
      { name: "David Willey", role: "Swing Bowler", rating: 78 },
    ],
  },
  {
    id: "mel-st", name: "Melbourne Stars", short: "STA",
    squad: [
      { name: "Glenn Maxwell", role: "All-Rounder", rating: 86 },
      { name: "Marcus Stoinis", role: "All-Rounder", rating: 82 },
      { name: "Hilton Cartwright", role: "Top-Order Bat", rating: 76 },
      { name: "Sam Harper", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Beau Webster", role: "All-Rounder", rating: 78 },
      { name: "Tom Rogers", role: "Pace Bowler", rating: 78 },
      { name: "Mark Steketee", role: "Pace Bowler", rating: 78 },
      { name: "Adam Zampa", role: "Leg-Spinner", rating: 84 },
      { name: "Hasan Ali", role: "Pace Bowler", rating: 80 },
      { name: "Joel Paris", role: "Pace Bowler", rating: 76 },
      { name: "Usama Mir", role: "Leg-Spinner", rating: 74 },
    ],
  },
  {
    id: "mel-re", name: "Melbourne Renegades", short: "REN",
    squad: [
      { name: "Jake Fraser-McGurk", role: "Top-Order Bat", rating: 84 },
      { name: "Aaron Finch", role: "Top-Order Bat", rating: 82 },
      { name: "Mackenzie Harvey", role: "Top-Order Bat", rating: 76 },
      { name: "Nic Maddinson", role: "Middle-Order Bat", rating: 78 },
      { name: "Jonathan Wells", role: "Middle-Order Bat", rating: 74 },
      { name: "Will Sutherland", role: "All-Rounder", rating: 78 },
      { name: "Tom Rogers", role: "Pace Bowler", rating: 76 },
      { name: "Kane Richardson", role: "Pace Bowler", rating: 80 },
      { name: "Adam Zampa", role: "Leg-Spinner", rating: 82 },
      { name: "Akeal Hosein", role: "Off-Spinner", rating: 78 },
      { name: "Jake Weatherald", role: "Wicket-Keeper Bat", rating: 76 },
    ],
  },
  {
    id: "per-sc", name: "Perth Scorchers", short: "SCO",
    squad: [
      { name: "Josh Inglis", role: "Wicket-Keeper Bat", rating: 82 },
      { name: "Cameron Bancroft", role: "Top-Order Bat", rating: 76 },
      { name: "Faf du Plessis", role: "Top-Order Bat", rating: 84 },
      { name: "Ashton Turner", role: "All-Rounder", rating: 78 },
      { name: "Aaron Hardie", role: "All-Rounder", rating: 78 },
      { name: "Cooper Connolly", role: "All-Rounder", rating: 76 },
      { name: "Andrew Tye", role: "Pace Bowler", rating: 80 },
      { name: "Jhye Richardson", role: "Pace Bowler", rating: 82 },
      { name: "Lance Morris", role: "Pace Bowler", rating: 80 },
      { name: "Ashton Agar", role: "Off-Spinner", rating: 80 },
      { name: "Matt Kelly", role: "Pace Bowler", rating: 74 },
    ],
  },
  {
    id: "bri-he", name: "Brisbane Heat", short: "HEA",
    squad: [
      { name: "Usman Khawaja", role: "Top-Order Bat", rating: 82 },
      { name: "Nathan McSweeney", role: "Top-Order Bat", rating: 76 },
      { name: "Colin Munro", role: "Top-Order Bat", rating: 80 },
      { name: "Marnus Labuschagne", role: "Middle-Order Bat", rating: 84 },
      { name: "Jimmy Peirson", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Michael Neser", role: "All-Rounder", rating: 78 },
      { name: "Spencer Johnson", role: "Pace Bowler", rating: 82 },
      { name: "Mark Steketee", role: "Pace Bowler", rating: 78 },
      { name: "Mitchell Swepson", role: "Leg-Spinner", rating: 80 },
      { name: "Matthew Kuhnemann", role: "Off-Spinner", rating: 78 },
      { name: "Xavier Bartlett", role: "Pace Bowler", rating: 78 },
    ],
  },
  {
    id: "ade-st", name: "Adelaide Strikers", short: "STR",
    squad: [
      { name: "Travis Head", role: "Top-Order Bat", rating: 88 },
      { name: "Chris Lynn", role: "Top-Order Bat", rating: 80 },
      { name: "Alex Carey", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Matthew Short", role: "All-Rounder", rating: 80 },
      { name: "Jake Weatherald", role: "Top-Order Bat", rating: 76 },
      { name: "Henry Thornton", role: "Pace Bowler", rating: 76 },
      { name: "Wes Agar", role: "Pace Bowler", rating: 76 },
      { name: "Rashid Khan", role: "Leg-Spinner", rating: 88 },
      { name: "Peter Siddle", role: "Pace Bowler", rating: 78 },
      { name: "Lloyd Pope", role: "Leg-Spinner", rating: 76 },
      { name: "Wanindu Hasaranga", role: "Leg-Spinner", rating: 84 },
    ],
  },
  {
    id: "hob-hu", name: "Hobart Hurricanes", short: "HUR",
    squad: [
      { name: "Matthew Wade", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "D'Arcy Short", role: "Top-Order Bat", rating: 78 },
      { name: "Ben McDermott", role: "Top-Order Bat", rating: 78 },
      { name: "Tim David", role: "Finisher", rating: 84 },
      { name: "Mitchell Owen", role: "All-Rounder", rating: 76 },
      { name: "Caleb Jewell", role: "Middle-Order Bat", rating: 74 },
      { name: "Nathan Ellis", role: "Pace Bowler", rating: 82 },
      { name: "Riley Meredith", role: "Pace Bowler", rating: 80 },
      { name: "Chris Jordan", role: "Pace Bowler", rating: 80 },
      { name: "Faheem Ashraf", role: "All-Rounder", rating: 76 },
      { name: "Paddy Dooley", role: "Off-Spinner", rating: 72 },
    ],
  },
];

export const PSL_TEAMS: LeagueTeam[] = [
  {
    id: "isl", name: "Islamabad United", short: "ISL",
    squad: [
      { name: "Shadab Khan", role: "Leg-Spinner", rating: 82 },
      { name: "Imad Wasim", role: "All-Rounder", rating: 78 },
      { name: "Colin Munro", role: "Top-Order Bat", rating: 80 },
      { name: "Salman Agha", role: "All-Rounder", rating: 78 },
      { name: "Agha Salman", role: "Middle-Order Bat", rating: 78 },
      { name: "Jordan Cox", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Hunain Shah", role: "Pace Bowler", rating: 74 },
      { name: "Naseem Shah", role: "Pace Bowler", rating: 84 },
      { name: "Faheem Ashraf", role: "All-Rounder", rating: 78 },
      { name: "Mohammad Wasim Jr", role: "Pace Bowler", rating: 78 },
      { name: "Rumman Raees", role: "Pace Bowler", rating: 76 },
    ],
  },
  {
    id: "kar", name: "Karachi Kings", short: "KAR",
    squad: [
      { name: "Mohammad Amir", role: "Swing Bowler", rating: 82 },
      { name: "James Vince", role: "Top-Order Bat", rating: 80 },
      { name: "Tim Seifert", role: "Wicket-Keeper Bat", rating: 78 },
      { name: "Shoaib Malik", role: "All-Rounder", rating: 78 },
      { name: "Khushdil Shah", role: "Finisher", rating: 76 },
      { name: "Aamir Jamal", role: "All-Rounder", rating: 76 },
      { name: "Mir Hamza", role: "Pace Bowler", rating: 78 },
      { name: "Hasan Ali", role: "Pace Bowler", rating: 80 },
      { name: "Abrar Ahmed", role: "Leg-Spinner", rating: 78 },
      { name: "Adam Milne", role: "Pace Bowler", rating: 78 },
      { name: "Tim Southee", role: "Swing Bowler", rating: 84 },
    ],
  },
  {
    id: "lah", name: "Lahore Qalandars", short: "LQ",
    squad: [
      { name: "Shaheen Shah Afridi", role: "Pace Bowler", rating: 90 },
      { name: "Fakhar Zaman", role: "Top-Order Bat", rating: 84 },
      { name: "Sikandar Raza", role: "All-Rounder", rating: 82 },
      { name: "Kusal Perera", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Daryl Mitchell", role: "Middle-Order Bat", rating: 80 },
      { name: "David Wiese", role: "All-Rounder", rating: 78 },
      { name: "Haris Rauf", role: "Pace Bowler", rating: 84 },
      { name: "Zaman Khan", role: "Pace Bowler", rating: 76 },
      { name: "Rashid Khan", role: "Leg-Spinner", rating: 88 },
      { name: "Salman Mirza", role: "Pace Bowler", rating: 72 },
      { name: "Asif Ali", role: "Finisher", rating: 76 },
    ],
  },
  {
    id: "mul", name: "Multan Sultans", short: "MUL",
    squad: [
      { name: "Mohammad Rizwan", role: "Wicket-Keeper Bat", rating: 86 },
      { name: "Yasir Khan", role: "Top-Order Bat", rating: 74 },
      { name: "Iftikhar Ahmed", role: "All-Rounder", rating: 78 },
      { name: "Reeza Hendricks", role: "Top-Order Bat", rating: 78 },
      { name: "Johnson Charles", role: "Top-Order Bat", rating: 78 },
      { name: "Kamran Ghulam", role: "Middle-Order Bat", rating: 74 },
      { name: "Usama Mir", role: "Leg-Spinner", rating: 76 },
      { name: "Mohammad Ali", role: "Pace Bowler", rating: 76 },
      { name: "Akeal Hosein", role: "Off-Spinner", rating: 80 },
      { name: "Ihsanullah", role: "Pace Bowler", rating: 78 },
      { name: "Chris Jordan", role: "Pace Bowler", rating: 80 },
    ],
  },
  {
    id: "pes", name: "Peshawar Zalmi", short: "PZ",
    squad: [
      { name: "Babar Azam", role: "Top-Order Bat", rating: 90 },
      { name: "Saim Ayub", role: "Top-Order Bat", rating: 80 },
      { name: "Mohammad Haris", role: "Wicket-Keeper Bat", rating: 78 },
      { name: "Paul Walter", role: "All-Rounder", rating: 76 },
      { name: "Rovman Powell", role: "Finisher", rating: 80 },
      { name: "Tom Kohler-Cadmore", role: "Top-Order Bat", rating: 78 },
      { name: "Aamer Jamal", role: "All-Rounder", rating: 76 },
      { name: "Arif Yaqoob", role: "Pace Bowler", rating: 72 },
      { name: "Hussain Talat", role: "All-Rounder", rating: 74 },
      { name: "Sufiyan Muqeem", role: "Leg-Spinner", rating: 76 },
      { name: "Mehran Mumtaz", role: "Off-Spinner", rating: 72 },
    ],
  },
  {
    id: "que", name: "Quetta Gladiators", short: "QG",
    squad: [
      { name: "Saud Shakeel", role: "Top-Order Bat", rating: 80 },
      { name: "Hasan Nawaz", role: "Middle-Order Bat", rating: 76 },
      { name: "Rilee Rossouw", role: "Middle-Order Bat", rating: 80 },
      { name: "Mohammad Wasim Jr", role: "Pace Bowler", rating: 78 },
      { name: "Sean Abbott", role: "All-Rounder", rating: 78 },
      { name: "Akeal Hosein", role: "Off-Spinner", rating: 78 },
      { name: "Khurram Shahzad", role: "Pace Bowler", rating: 74 },
      { name: "Faheem Ashraf", role: "All-Rounder", rating: 76 },
      { name: "Abrar Ahmed", role: "Leg-Spinner", rating: 78 },
      { name: "Mohammad Amir", role: "Swing Bowler", rating: 80 },
      { name: "Kane Richardson", role: "Pace Bowler", rating: 78 },
    ],
  },
];

export const COUNTY_TEAMS: LeagueTeam[] = [
  {
    id: "sur", name: "Surrey", short: "SUR",
    squad: [
      { name: "Rory Burns", role: "Top-Order Bat", rating: 80 },
      { name: "Dom Sibley", role: "Top-Order Bat", rating: 76 },
      { name: "Ollie Pope", role: "Middle-Order Bat", rating: 84 },
      { name: "Ben Foakes", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Jamie Smith", role: "Wicket-Keeper Bat", rating: 80 },
      { name: "Sam Curran", role: "All-Rounder", rating: 80 },
      { name: "Will Jacks", role: "All-Rounder", rating: 80 },
      { name: "Dan Worrall", role: "Pace Bowler", rating: 80 },
      { name: "Kemar Roach", role: "Pace Bowler", rating: 80 },
      { name: "Jordan Clark", role: "All-Rounder", rating: 76 },
      { name: "Cameron Steel", role: "Leg-Spinner", rating: 72 },
    ],
  },
  {
    id: "yor", name: "Yorkshire", short: "YOR",
    squad: [
      { name: "Adam Lyth", role: "Top-Order Bat", rating: 78 },
      { name: "Fin Bean", role: "Top-Order Bat", rating: 74 },
      { name: "Harry Brook", role: "Middle-Order Bat", rating: 86 },
      { name: "Jonny Bairstow", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Jonathan Tattersall", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Jordan Thompson", role: "All-Rounder", rating: 76 },
      { name: "Dom Bess", role: "Off-Spinner", rating: 78 },
      { name: "Matthew Fisher", role: "Pace Bowler", rating: 76 },
      { name: "Ben Coad", role: "Pace Bowler", rating: 78 },
      { name: "Mickey Edwards", role: "Pace Bowler", rating: 74 },
      { name: "Jafer Chohan", role: "Leg-Spinner", rating: 72 },
    ],
  },
  {
    id: "lan", name: "Lancashire", short: "LAN",
    squad: [
      { name: "Keaton Jennings", role: "Top-Order Bat", rating: 80 },
      { name: "Luke Wells", role: "Top-Order Bat", rating: 76 },
      { name: "Josh Bohannon", role: "Middle-Order Bat", rating: 78 },
      { name: "Phil Salt", role: "Wicket-Keeper Bat", rating: 84 },
      { name: "Dane Vilas", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Liam Livingstone", role: "All-Rounder", rating: 84 },
      { name: "Tom Hartley", role: "Off-Spinner", rating: 80 },
      { name: "James Anderson", role: "Swing Bowler", rating: 86 },
      { name: "Saqib Mahmood", role: "Pace Bowler", rating: 78 },
      { name: "Tom Bailey", role: "Pace Bowler", rating: 76 },
      { name: "Jack Blatherwick", role: "Pace Bowler", rating: 72 },
    ],
  },
  {
    id: "mid", name: "Middlesex", short: "MID",
    squad: [
      { name: "Mark Stoneman", role: "Top-Order Bat", rating: 76 },
      { name: "Sam Robson", role: "Top-Order Bat", rating: 78 },
      { name: "Max Holden", role: "Middle-Order Bat", rating: 76 },
      { name: "John Simpson", role: "Wicket-Keeper Bat", rating: 78 },
      { name: "Joe Cracknell", role: "Wicket-Keeper Bat", rating: 72 },
      { name: "Toby Roland-Jones", role: "All-Rounder", rating: 78 },
      { name: "Tim Murtagh", role: "Pace Bowler", rating: 78 },
      { name: "Ethan Bamber", role: "Pace Bowler", rating: 74 },
      { name: "Luke Hollman", role: "Leg-Spinner", rating: 74 },
      { name: "Ryan Higgins", role: "All-Rounder", rating: 78 },
      { name: "Blake Cullen", role: "Pace Bowler", rating: 74 },
    ],
  },
  {
    id: "som", name: "Somerset", short: "SOM",
    squad: [
      { name: "Tom Banton", role: "Top-Order Bat", rating: 80 },
      { name: "Tom Lammonby", role: "Top-Order Bat", rating: 76 },
      { name: "James Rew", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Tom Abell", role: "Middle-Order Bat", rating: 78 },
      { name: "Lewis Gregory", role: "All-Rounder", rating: 80 },
      { name: "Craig Overton", role: "All-Rounder", rating: 78 },
      { name: "Jack Leach", role: "Off-Spinner", rating: 80 },
      { name: "Migael Pretorius", role: "Pace Bowler", rating: 78 },
      { name: "Josh Davey", role: "All-Rounder", rating: 76 },
      { name: "Shoaib Bashir", role: "Off-Spinner", rating: 76 },
      { name: "Kasey Aldridge", role: "Pace Bowler", rating: 72 },
    ],
  },
  {
    id: "ess", name: "Essex", short: "ESS",
    squad: [
      { name: "Dean Elgar", role: "Top-Order Bat", rating: 80 },
      { name: "Nick Browne", role: "Top-Order Bat", rating: 76 },
      { name: "Tom Westley", role: "Middle-Order Bat", rating: 78 },
      { name: "Jordan Cox", role: "Wicket-Keeper Bat", rating: 76 },
      { name: "Michael Pepper", role: "Wicket-Keeper Bat", rating: 74 },
      { name: "Matt Critchley", role: "All-Rounder", rating: 78 },
      { name: "Simon Harmer", role: "Off-Spinner", rating: 84 },
      { name: "Sam Cook", role: "Pace Bowler", rating: 80 },
      { name: "Shane Snater", role: "Pace Bowler", rating: 76 },
      { name: "Daniel Sams", role: "All-Rounder", rating: 78 },
      { name: "Jamie Porter", role: "Pace Bowler", rating: 78 },
    ],
  },
];

export const LEAGUE_BY_ID: Record<LeagueId, LeagueTeam[]> = {
  IPL: IPL_TEAMS,
  BBL: BBL_TEAMS,
  PSL: PSL_TEAMS,
  County: COUNTY_TEAMS,
};

export const LEAGUE_LABEL: Record<LeagueId, string> = {
  IPL: "Indian Premier League",
  BBL: "Big Bash League",
  PSL: "Pakistan Super League",
  County: "County Championship",
};

export const LEAGUE_FORMAT: Record<LeagueId, "T20" | "ODI" | "Test" | "Club"> = {
  IPL: "T20",
  BBL: "T20",
  PSL: "T20",
  County: "Test",
};

// Helper: get the right squad to use for a fixture's opposition
export function getOppositionSquad(opts: {
  competition: string;
  opponent: string;
  format: "T20" | "ODI" | "Test" | "Club";
  nation?: import("./types").Nation;
}): RosterPlayer[] | null {
  // League team match
  for (const lid of Object.keys(LEAGUE_BY_ID) as LeagueId[]) {
    const team = LEAGUE_BY_ID[lid].find((t) => t.name === opts.opponent);
    if (team) return team.squad;
  }
  // International match — opponent is "<Nation> National Team" or "<Nation> A"
  const nationKeys = Object.keys(INTERNATIONAL) as Array<keyof typeof INTERNATIONAL>;
  for (const n of nationKeys) {
    if (opts.opponent.startsWith(n)) {
      const fmtKey: keyof FormatSquads =
        opts.format === "Test" ? "Test" : opts.format === "ODI" ? "ODI" : "T20I";
      return INTERNATIONAL[n][fmtKey];
    }
  }
  return null;
}

export function getNationSquad(nation: Nation, format: "T20" | "ODI" | "Test"): RosterPlayer[] {
  const fmtKey: keyof FormatSquads = format === "Test" ? "Test" : format === "ODI" ? "ODI" : "T20I";
  return INTERNATIONAL[nation][fmtKey];
}

// Generated/club names: realistic per-region patterns
const CLUB_NAMES_BY_NATION: Record<Nation, { first: string[]; last: string[] }> = {
  India:        { first: ["Arjun","Rahul","Vikram","Sanjay","Karan","Amit","Rohit","Yash","Ishan","Dev","Aakash","Manish","Pranav","Tushar","Saurabh"], last: ["Sharma","Patel","Kumar","Singh","Verma","Iyer","Rao","Mehta","Agarwal","Joshi","Chopra","Reddy"] },
  Pakistan:     { first: ["Asad","Bilal","Faisal","Hamza","Imran","Junaid","Kashif","Naveed","Omer","Saad","Tariq","Usman","Waqar","Yasir","Zubair"], last: ["Khan","Ahmed","Ali","Hussain","Iqbal","Malik","Raza","Shah","Sheikh","Siddiqui","Akhtar"] },
  Australia:    { first: ["Jack","Liam","Noah","Oliver","Will","Cooper","Hunter","Ethan","Lachlan","Riley","Connor","Mason","Tyler","Brody","Logan"], last: ["Smith","Jones","Brown","Wilson","Taylor","Anderson","Thomas","White","Roberts","Walker","Hughes","Murphy"] },
  England:      { first: ["Harry","George","Oliver","Jack","Charlie","Thomas","Henry","James","William","Alfie","Oscar","Ethan","Dylan","Freddie"], last: ["Smith","Jones","Williams","Brown","Davies","Evans","Wilson","Thomas","Roberts","Johnson","Walker","Wright"] },
  "South Africa": { first: ["Pieter","Jaco","Hendrik","Wian","Ruan","Stiaan","Marnus","Theunis","Werner","JP","Kyle","Dean","Heinrich","Reeza"], last: ["Botha","Pretorius","du Plessis","van der Merwe","van Wyk","Coetzee","Steyn","Smith","Adams","Hendricks","Linde","Klaasen"] },
  "New Zealand":{ first: ["Jamie","Liam","Mitchell","Tom","Hamish","Ben","Will","Henry","Ollie","Cole","Logan","Finn","Blake","Connor"], last: ["Henry","Wright","Anderson","McCullum","Walker","Taylor","Boult","Wagner","Conway","Phillips","Mitchell","Williamson"] },
  "West Indies":{ first: ["Shai","Romario","Kemar","Jayden","Shimron","Akeal","Sherfane","Roston","Brandon","Alzarri","Nicholas","Romario","Shamar","Jermaine"], last: ["Charles","Hope","Joseph","Pooran","Russell","Hosein","Powell","Chase","King","Williams","Holder","Forde"] },
  "Sri Lanka":  { first: ["Dimuth","Pathum","Kusal","Wanindu","Maheesh","Charith","Avishka","Dasun","Lahiru","Asitha","Dunith","Kamindu","Nuwan","Sadeera"], last: ["Perera","Mendis","Fernando","Silva","de Silva","Hasaranga","Nissanka","Asalanka","Pathirana","Theekshana","Wellalage","Madushanka"] },
  Bangladesh:   { first: ["Tamim","Liton","Mushfiqur","Mahmudullah","Shakib","Mehidy","Taskin","Mustafizur","Najmul","Towhid","Tanzid","Rishad","Shoriful","Hasan"], last: ["Ahmed","Rahman","Hossain","Islam","Khan","Hasan","Iqbal","Mahmud","Shanto","Hridoy","Miraz","Riyad"] },
};

export function generateClubName(nation: Nation): string {
  const pool = CLUB_NAMES_BY_NATION[nation];
  return `${pool.first[Math.floor(Math.random()*pool.first.length)]} ${pool.last[Math.floor(Math.random()*pool.last.length)]}`;
}

const CLUB_ROLES: Role[] = [
  "Top-Order Bat","Top-Order Bat","Middle-Order Bat","Middle-Order Bat",
  "Wicket-Keeper Bat","All-Rounder","All-Rounder",
  "Pace Bowler","Pace Bowler","Off-Spinner","Leg-Spinner",
];

export function generateClubSquad(nation: Nation, opponent: string, size = 11): RosterPlayer[] {
  // Seed-ish: stable per-opponent name list using simple hash
  let seed = 0;
  for (let i = 0; i < opponent.length; i++) seed = (seed * 31 + opponent.charCodeAt(i)) >>> 0;
  function rng() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  }
  const pool = CLUB_NAMES_BY_NATION[nation];
  const used = new Set<string>();
  const squad: RosterPlayer[] = [];
  while (squad.length < size) {
    const f = pool.first[Math.floor(rng() * pool.first.length)];
    const l = pool.last[Math.floor(rng() * pool.last.length)];
    const name = `${f} ${l}`;
    if (used.has(name)) continue;
    used.add(name);
    squad.push({
      name,
      role: CLUB_ROLES[squad.length],
      rating: 50 + Math.floor(rng() * 18), // 50-67
    });
  }
  return squad;
}
