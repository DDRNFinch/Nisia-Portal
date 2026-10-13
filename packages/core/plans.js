/* What a college can subscribe to, and what it costs. One place to change the prices and what's in each part, so the
   commercial model can move without touching the apps. Prices are per learner seat per year, before VAT.
   Evia Core comes with Evia Portal; the assistants are optional and can be added in any order.
   Each capability says whether it's live or still to come, so nothing unbuilt is shown as working.
   Entitlements (which college has which assistant) aren't enforced yet: during the pilot every college has all three. */
export const PLANS = {
  currency: "GBP",
  vatRate: 0.2,
  /* A college that takes all three assistants pays this for the lot, instead of adding them up. */
  bundle: { price: 95, label: "Evia with all three assistants" },
  core: {
    id: "core", name: "Evia Core + Evia Portal", price: 45, colour: "#E5BC02",
    purpose: "The apprentice app and the college's control centre. Every college has both.",
    who: "Apprentices, and the college's admins",
    live: [
      "Evidence: photos, video, voice and write-ups against each topic and its KSBs",
      "Portfolio, sent as a PDF or zip to any e-portfolio",
      "Progress, statistics and learning hours",
      "Confidence checks, lessons and games, EPA mock tests, EDI learning",
      "Accessibility and personal settings",
      "Evia Portal: learners, staff and roles, courses, classes and seats",
      "Registers and attendance: QR check-in, absences, the attendance report and today's live board",
      "Topic editing: the college's own course packs and their KSBs",
      "Impact and usage reports",
    ],
    coming: ["Buying seats online in Evia Portal", "Links with Aptem and other MIS (exports today)"],
  },
  assistants: [
    {
      id: "symi", name: "Symi", price: 20, colour: "#38A96B", app: "../tutor/",
      purpose: "Teaching and course delivery: plan, teach and record learning.",
      who: "Tutors and teaching staff",
      live: [
        "Schemes of work for each course, session by session",
        "Lesson plans with outcomes and KSBs",
        "Picture slides to teach from",
        "Class quizzes on learners' phones, with scores to the assessor",
        "Class management and the classroom screen",
        "Teaching resources: the college's own and shared between colleges",
        "Course development: build and change teaching for any course",
      ],
      coming: ["Maths and English lessons for classes (in Evia for apprentices today)", "ICT learning"],
      note: "Registers and attendance are included with every Evia subscription, so they work without Symi.",
      story: [
        ["Tom Clarke", "Tutor", "symi", "Opens L2 Bricklaying: the scheme of work has today's lesson, Cavity walls, with its plan and KSBs ready.", true],
        ["Class", "Learners", "evia", "Scan the code on the classroom screen to check in; the register fills itself.", true],
        ["Tom Clarke", "Tutor", "symi", "Teaches from picture slides, then runs a quick quiz on everyone's phones.", true],
        ["Priya Shah", "Assessor", "milos", "Sees each learner's quiz score next to their evidence.", true],
        ["Jordan Reece", "Apprentice", "evia", "Gets the session in his learning hours, with the KSBs it covered.", true],
      ],
    },
    {
      id: "milos", name: "Milos", price: 20, colour: "#2C85F7", app: "../milos/",
      purpose: "Assessment and reviews: look at evidence, record decisions, plan what's next.",
      who: "Assessors and quality staff",
      live: [
        "Assessment decisions on the evidence apprentices send from Evia (nothing uploaded twice)",
        "KSBs signed off by the assessor: evidence sent, evidence reviewed and competence confirmed stay separate",
        "Progress reviews filled in from Evia, signed by apprentice, employer and assessor, with a PDF",
        "Observations",
        "Visits and assessment bookings, shown in the apprentice's calendar",
        "Employer feedback and witness testimonies in the review",
      ],
      coming: [],
      note: "Editing the college's evidence topics is in Evia Portal, so every college can do it.",
      story: [
        ["Jordan Reece", "Apprentice", "evia", "Photographs the cavity wall he built and writes what he did; Evia files it under Cavity walling with four KSBs.", true],
        ["Priya Shah", "Assessor", "milos", "Sees it in To assess, with the photos, write-up and KSBs.", true],
        ["Priya Shah", "Assessor", "milos", "Decides “Not yet”: “Show the wall ties and the DPC.” Signs off the KSBs that are met.", true],
        ["Jordan Reece", "Apprentice", "evia", "Gets the feedback; Evia's catch-up asks for exactly what's missing.", true],
        ["Priya Shah", "Assessor", "milos", "Books an observation visit; it appears in Jordan's Evia calendar.", true],
      ],
    },
    {
      id: "paros", name: "Paros", price: 15, colour: "#F28C28", app: "../paros/",
      purpose: "Employer engagement: the workplace's part in the apprenticeship.",
      who: "Employers and workplace mentors",
      live: [
        "Their own apprentices only: progress, evidence covered and college attendance",
        "Confirming learning hours done at work",
        "Witness testimonies, signed",
        "Behaviour ratings and employer feedback",
        "When reviews are due, and signing them with the assessor",
        "Booking days off for their apprentice",
      ],
      coming: ["One-to-one sessions", "Recording workplace learning sessions", "A summary of each review for the employer"],
      note: "Employers never see the college's own notes or assessment records.",
      story: [
        ["Hannah Wade", "Employer", "paros", "Opens Paros: Jordan's progress, college attendance and hours waiting to be confirmed.", true],
        ["Hannah Wade", "Employer", "paros", "Confirms his hours and signs a witness testimony for the garden wall he built.", true],
        ["Priya Shah", "Assessor", "milos", "Sees the testimony and the employer's ratings in Jordan's review.", true],
        ["Jordan Reece", "Apprentice", "evia", "Finds the testimony in his supporting evidence.", true],
        ["Hannah Wade", "Employer", "paros", "Records a one-to-one with Jordan.", false],
      ],
    },
  ],
};

/* The yearly price for a college's seats with a set of assistants, before and after VAT. */
export function quote(seats, ids) {
  const a = PLANS.assistants.filter((x) => ids.includes(x.id));
  const each = a.length === PLANS.assistants.length ? PLANS.bundle.price : PLANS.core.price + a.reduce((n, x) => n + x.price, 0);
  const net = each * seats, vat = Math.round(net * PLANS.vatRate * 100) / 100;
  return { each, net, vat, total: net + vat };
}
export const money = (n) => "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
