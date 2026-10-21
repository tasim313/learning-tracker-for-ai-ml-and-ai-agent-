import { courseSchema, type Course, type LessonBlockInput as LessonBlock, type LessonInput as Lesson } from "@/lib/content/schema";

/**
 * Introductory seed course shipped with the platform. It is platform-authored,
 * labelled as introductory, and links to third-party material instead of copying it.
 * External links have not been availability-checked by the platform.
 */
const at = "2026-10-19T00:00:00.000Z";

const text = (id: string, title: string, body: string, role?: LessonBlock["role"]): LessonBlock => ({ id, type: "text", title, body, role });
const callout = (id: string, tone: "info" | "tip" | "warning" | "misconception", body: string): LessonBlock => ({ id, type: "callout", tone, body });

const vectors: Lesson = {
  id: "vectors-and-dot-products",
  title: "Vectors, dot products, and similarity",
  summary: "Represent data as vectors and measure how similar two vectors are — the operation behind linear models, attention, and embedding search.",
  objectives: ["Compute a dot product and a vector length by hand", "Explain cosine similarity and when it is used", "Compute similarity with NumPy"],
  prerequisites: [],
  difficulty: "fundamental",
  tags: ["linear algebra", "embeddings"],
  estimatedMinutes: 45,
  version: 1,
  relatedTopicIds: ["workbook-LRN-003", "workbook-LRN-013"],
  glossary: [
    { term: "Vector", definition: "An ordered list of numbers, such as the features of one example or an embedding." },
    { term: "Dot product", definition: "The sum of element-wise products of two equal-length vectors." },
    { term: "Norm (length)", definition: "The Euclidean length of a vector: the square root of the sum of its squared elements." },
    { term: "Cosine similarity", definition: "The dot product divided by the product of the lengths; the cosine of the angle between the vectors." }
  ],
  translations: { bn: {
    title: "ভেক্টর, ডট গুণফল ও সাদৃশ্য",
    summary: "ডেটাকে ভেক্টর হিসেবে প্রকাশ করুন এবং দুটি ভেক্টর কতটা সাদৃশ্যপূর্ণ তা মাপুন—লিনিয়ার মডেল, অ্যাটেনশন ও এমবেডিং সার্চে ব্যবহৃত একটি মৌলিক গণনা।",
    fields: {
      "objectives.0": "হাতে ডট গুণফল ও ভেক্টরের দৈর্ঘ্য নির্ণয় করুন",
      "objectives.1": "কোসাইন সাদৃশ্য কী এবং কখন ব্যবহার হয় তা ব্যাখ্যা করুন",
      "objectives.2": "NumPy দিয়ে সাদৃশ্য নির্ণয় করুন",
      "glossary.0.term": "ভেক্টর", "glossary.0.definition": "সংখ্যার একটি সুশৃঙ্খল তালিকা; যেমন কোনো উদাহরণের বৈশিষ্ট্য বা একটি এমবেডিং।",
      "glossary.1.term": "ডট গুণফল", "glossary.1.definition": "সমান দৈর্ঘ্যের দুটি ভেক্টরের একই অবস্থানের উপাদানগুলোর গুণফলের যোগফল।",
      "glossary.2.term": "নর্ম (দৈর্ঘ্য)", "glossary.2.definition": "ভেক্টরের ইউক্লিডীয় দৈর্ঘ্য: উপাদানগুলোর বর্গের যোগফলের বর্গমূল।",
      "glossary.3.term": "কোসাইন সাদৃশ্য", "glossary.3.definition": "ডট গুণফলকে দুই ভেক্টরের দৈর্ঘ্যের গুণফল দিয়ে ভাগ করলে যে মান পাওয়া যায়; এটি ভেক্টর দুটির মধ্যবর্তী কোণের কোসাইন।"
    }
  } },
  blocks: [
    { id: "pre-check", type: "quiz", title: "Before you start", phase: "before", questions: [
      { id: "q-pre-1", prompt: "What is $3 \\times 4 + 1 \\times 2$?", kind: "numeric", options: [], answer: ["14"], tolerance: 0, hint: "Multiply first, then add.", explanation: "12 + 2 = 14. A dot product is exactly this pattern: multiply matching elements, then add." }
    ] },
    text("intuition", "Intuition first", "A **vector** is an ordered list of numbers. A house can be described as `[area, bedrooms]`, and a sentence can be turned into an *embedding* with hundreds of numbers.\n\nThe **dot product** asks: *how much do two vectors point in the same direction, weighted by their sizes?* If they point the same way the result is large and positive, if they are perpendicular it is zero, and if they point in opposite directions it is negative."),
    text("formal", "Definitions", "For vectors $\\mathbf{a}, \\mathbf{b} \\in \\mathbb{R}^n$:\n\n$$\\mathbf{a}\\cdot\\mathbf{b} = \\sum_{i=1}^{n} a_i b_i = \\lVert\\mathbf{a}\\rVert\\,\\lVert\\mathbf{b}\\rVert\\cos\\theta$$\n\n$$\\lVert\\mathbf{a}\\rVert = \\sqrt{\\sum_i a_i^2}\\qquad \\text{cosine similarity} = \\frac{\\mathbf{a}\\cdot\\mathbf{b}}{\\lVert\\mathbf{a}\\rVert\\,\\lVert\\mathbf{b}\\rVert}$$\n\nCosine similarity ranges from −1 to 1 and ignores vector length, which is why it is commonly used to compare embeddings."),
    text("worked", "Worked example", "Let $\\mathbf{a} = [2, 1]$ and $\\mathbf{b} = [3, 4]$.\n\n1. Dot product: $2\\cdot3 + 1\\cdot4 = 6 + 4 = 10$.\n2. Lengths: $\\lVert\\mathbf{a}\\rVert = \\sqrt{4+1} = \\sqrt5 \\approx 2.2361$, $\\lVert\\mathbf{b}\\rVert = \\sqrt{9+16} = 5$.\n3. Cosine similarity: $10 / (\\sqrt5 \\cdot 5) = 2/\\sqrt5 \\approx 0.8944$.\n\nThe exact value is $2/\\sqrt5$; 0.8944 is a rounded approximation.", "worked-example"),
    { id: "numpy", type: "code", language: "python", caption: "The same calculation with NumPy", code: "import numpy as np\n\na = np.array([2.0, 1.0])\nb = np.array([3.0, 4.0])\n\ndot = a @ b                      # 10.0\ncosine = dot / (np.linalg.norm(a) * np.linalg.norm(b))\nprint(dot, round(cosine, 4))      # 10.0 0.8944" },
    { id: "video", type: "video", title: "Dot products and duality (Essence of linear algebra, chapter 9)", url: "https://www.youtube.com/watch?v=LyGKycYT2v0", provider: "youtube", youtubeId: "LyGKycYT2v0", embedAllowed: true, publisher: "3Blue1Brown", license: "Standard YouTube licence — embedded via YouTube's player, not redistributed", chapters: [], keyConcepts: ["Dot product as projection", "Sign of the dot product and direction"], followUpQuestions: ["Why is the dot product of perpendicular vectors zero?"] },
    callout("misconception", "misconception", "**A larger dot product does not always mean 'more similar'.** Long vectors produce large dot products even when the angle between them is wide. Use cosine similarity when only direction matters."),
    { id: "guided", type: "exercise", kind: "guided", title: "Guided: cosine similarity of [1, 0] and [1, 1]", prompt: "Compute the cosine similarity of $\\mathbf{u} = [1, 0]$ and $\\mathbf{v} = [1, 1]$. Give your answer to 4 decimal places.", steps: ["Dot product: $1\\cdot1 + 0\\cdot1$", "Lengths: $\\lVert\\mathbf{u}\\rVert = 1$, $\\lVert\\mathbf{v}\\rVert = \\sqrt2$", "Divide the dot product by the product of the lengths"], hints: ["The angle between the vectors is 45°."], solution: "Dot product = 1; lengths 1 and $\\sqrt2$; cosine similarity $= 1/\\sqrt2 \\approx 0.7071$ (exactly $\\cos 45°$).", check: { kind: "numeric", answer: "0.7071", tolerance: 0.0005 } },
    { id: "independent", type: "exercise", kind: "independent", title: "Independent: rank documents by similarity", prompt: "A query embedding is $q = [1, 2, 0]$. Two documents are $d_1 = [2, 4, 0]$ and $d_2 = [0, 1, 3]$. Which document is more similar by cosine similarity? Enter `d1` or `d2`.", steps: [], hints: ["$d_1$ is a scaled copy of $q$."], solution: "$d_1 = 2q$, so its cosine similarity is exactly 1. For $d_2$: $q\\cdot d_2 = 2$, $\\lVert q\\rVert = \\sqrt5$, $\\lVert d_2\\rVert = \\sqrt{10}$, giving $2/\\sqrt{50} \\approx 0.283$. **d1** is more similar.", check: { kind: "text", answer: "d1", tolerance: 0 } },
    { id: "after-check", type: "quiz", title: "Check your understanding", phase: "after", questions: [
      { id: "q1", prompt: "What is $[1, -2, 3] \\cdot [4, 0, -1]$?", kind: "numeric", options: [], answer: ["1"], tolerance: 0, hint: "Multiply matching elements: 4, 0, −3.", explanation: "4 + 0 − 3 = 1." },
      { id: "q2", prompt: "Two non-zero vectors have a dot product of 0. What is the angle between them?", kind: "single", options: ["0°", "45°", "90°", "180°"], answer: ["90°"], hint: "", explanation: "$\\cos\\theta = 0$ means θ = 90°: the vectors are perpendicular." },
      { id: "q3", prompt: "Cosine similarity changes when you double the length of one vector.", kind: "true-false", options: [], answer: ["false"], hint: "", explanation: "Scaling a vector by a positive number does not change its direction, so cosine similarity is unchanged." }
    ] },
    { id: "reflect", type: "reflection", prompt: "Where in an AI Sales Employee would you compare vectors? Think about matching a customer's question with product documentation." },
    { id: "reading", type: "reading", title: "Further reading", items: [
      { title: "numpy.dot reference", url: "https://numpy.org/doc/stable/reference/generated/numpy.dot.html", publisher: "NumPy", kind: "documentation", license: "BSD-3-Clause (documentation site)", note: "" },
      { title: "Essence of linear algebra (video series)", url: "https://www.3blue1brown.com/topics/linear-algebra", publisher: "3Blue1Brown", kind: "video", license: "Unknown — link only", note: "Visual intuition for vectors and matrices." }
    ] }
  ]
};

const vectorsBanglaBlocks: Record<string, Record<string, string>> = {
  "pre-check": { title: "শুরু করার আগে", "questions.0.prompt": "$3 × 4 + 1 × 2$ এর মান কত?", "questions.0.hint": "আগে গুণ করুন, তারপর যোগ করুন।", "questions.0.explanation": "12 + 2 = 14। ডট গুণফলেও ঠিক এই কাজ হয়: মিল থাকা উপাদানগুলো গুণ করে যোগ করা হয়।" },
  intuition: { title: "আগে ধারণাটি বুঝি", body: "একটি **ভেক্টর** হলো সংখ্যার সুশৃঙ্খল তালিকা। একটি বাড়িকে `[আয়তন, শোবার ঘর]` দিয়ে বর্ণনা করা যায়, আর একটি বাক্যকে শত শত সংখ্যার *এমবেডিং*-এ রূপান্তর করা যায়।\n\n**ডট গুণফল** জানতে চায়: দুটি ভেক্টর তাদের দৈর্ঘ্য বিবেচনায় নিয়ে একই দিকে কতটা নির্দেশ করে? তারা একই দিকে হলে ফল বড় ও ধনাত্মক, পরস্পর লম্ব হলে শূন্য, আর বিপরীত দিকে হলে ঋণাত্মক হয়।" },
  formal: { title: "সংজ্ঞা", body: "ভেক্টর $\\mathbf{a}, \\mathbf{b} \\in \\mathbb{R}^n$ হলে:\n\n$$\\mathbf{a}\\cdot\\mathbf{b} = \\sum_{i=1}^{n} a_i b_i = \\lVert\\mathbf{a}\\rVert\\,\\lVert\\mathbf{b}\\rVert\\cos\\theta$$\n\n$$\\lVert\\mathbf{a}\\rVert = \\sqrt{\\sum_i a_i^2}\\qquad \\text{কোসাইন সাদৃশ্য} = \\frac{\\mathbf{a}\\cdot\\mathbf{b}}{\\lVert\\mathbf{a}\\rVert\\,\\lVert\\mathbf{b}\\rVert}$$\n\nকোসাইন সাদৃশ্য −1 থেকে 1-এর মধ্যে থাকে এবং ভেক্টরের দৈর্ঘ্য বিবেচনা করে না। তাই এমবেডিং তুলনা করতে এটি বহুল ব্যবহৃত হয়।" },
  worked: { title: "সমাধানসহ উদাহরণ", body: "ধরি $\\mathbf{a} = [2, 1]$ এবং $\\mathbf{b} = [3, 4]$।\n\n1. ডট গুণফল: $2\\cdot3 + 1\\cdot4 = 6 + 4 = 10$।\n2. দৈর্ঘ্য: $\\lVert\\mathbf{a}\\rVert = \\sqrt{4+1} = \\sqrt5 \\approx 2.2361$, $\\lVert\\mathbf{b}\\rVert = \\sqrt{9+16} = 5$।\n3. কোসাইন সাদৃশ্য: $10 / (\\sqrt5 \\cdot 5) = 2/\\sqrt5 \\approx 0.8944$।\n\nসঠিক মান $2/\\sqrt5$; 0.8944 হলো কাছাকাছি মান।" },
  numpy: { title: "NumPy দিয়ে একই হিসাব" },
  video: { title: "ডট গুণফল ও দ্বৈততা (Essence of Linear Algebra, অধ্যায় ৯)", "keyConcepts.0": "প্রক্ষেপণ হিসেবে ডট গুণফল", "keyConcepts.1": "ডট গুণফলের চিহ্ন ও দিক", "followUpQuestions.0": "পরস্পর লম্ব ভেক্টরের ডট গুণফল শূন্য হয় কেন?" },
  misconception: { body: "**বড় ডট গুণফল মানেই বেশি সাদৃশ্য নয়।** কোণ বেশি হলেও লম্বা ভেক্টরের ডট গুণফল বড় হতে পারে। শুধু দিকের সাদৃশ্য জানতে কোসাইন সাদৃশ্য ব্যবহার করুন।" },
  guided: { title: "নির্দেশিত অনুশীলন: [1, 0] ও [1, 1]-এর কোসাইন সাদৃশ্য", prompt: "$\\mathbf{u} = [1, 0]$ এবং $\\mathbf{v} = [1, 1]$-এর কোসাইন সাদৃশ্য নির্ণয় করুন। চার দশমিক ঘর পর্যন্ত উত্তর দিন।", "steps.0": "ডট গুণফল: $1\\cdot1 + 0\\cdot1$", "steps.1": "দৈর্ঘ্য: $\\lVert\\mathbf{u}\\rVert = 1$, $\\lVert\\mathbf{v}\\rVert = \\sqrt2$", "steps.2": "ডট গুণফলকে দৈর্ঘ্য দুটির গুণফল দিয়ে ভাগ করুন", "hints.0": "ভেক্টর দুটির মধ্যবর্তী কোণ ৪৫°।", solution: "ডট গুণফল = 1; দৈর্ঘ্য 1 ও $\\sqrt2$; কোসাইন সাদৃশ্য $= 1/\\sqrt2 \\approx 0.7071$ (সঠিকভাবে $\\cos 45°$)।" },
  independent: { title: "স্বাধীন অনুশীলন: সাদৃশ্য অনুযায়ী নথি সাজান", prompt: "একটি প্রশ্নের এমবেডিং $q = [1, 2, 0]$। দুটি নথি হলো $d_1 = [2, 4, 0]$ এবং $d_2 = [0, 1, 3]$। কোসাইন সাদৃশ্য অনুযায়ী কোন নথিটি বেশি সাদৃশ্যপূর্ণ? `d1` অথবা `d2` লিখুন।", "hints.0": "$d_1$ হলো $q$-এর স্কেল করা রূপ।", solution: "$d_1 = 2q$, তাই এর কোসাইন সাদৃশ্য ঠিক 1। $d_2$-এর জন্য: $q\\cdot d_2 = 2$, $\\lVert q\\rVert = \\sqrt5$, $\\lVert d_2\\rVert = \\sqrt{10}$, ফলে $2/\\sqrt{50} \\approx 0.283$। **d1** বেশি সাদৃশ্যপূর্ণ।" },
  "after-check": { title: "আপনি কতটা বুঝেছেন যাচাই করুন", "questions.0.prompt": "$[1, -2, 3] · [4, 0, -1]$ এর মান কত?", "questions.0.hint": "একই অবস্থানের উপাদান গুণ করুন: 4, 0, −3।", "questions.0.explanation": "4 + 0 − 3 = 1।", "questions.1.prompt": "দুটি অশূন্য ভেক্টরের ডট গুণফল 0 হলে তাদের মধ্যবর্তী কোণ কত?", "questions.1.explanation": "$\\cos\\theta = 0$ হলে θ = 90°: ভেক্টর দুটি পরস্পর লম্ব।", "questions.2.prompt": "একটি ভেক্টরের দৈর্ঘ্য দ্বিগুণ করলে কোসাইন সাদৃশ্য বদলে যায়।", "questions.2.explanation": "ধনাত্মক সংখ্যা দিয়ে ভেক্টর স্কেল করলে দিক বদলায় না, তাই কোসাইন সাদৃশ্যও বদলায় না।" },
  reflect: { prompt: "এআই বিক্রয় সহকারীতে কোথায় ভেক্টর তুলনা করতে পারেন? কোনো গ্রাহকের প্রশ্নের সঙ্গে পণ্যের নথি মেলানোর কথা ভাবুন।" },
  reading: { title: "আরও পড়ুন", "items.0.title": "numpy.dot-এর নির্দেশিকা", "items.1.title": "Essence of Linear Algebra (ভিডিও সিরিজ)", "items.1.note": "ভেক্টর ও ম্যাট্রিক্স সম্পর্কে দৃশ্যমান ধারণা।" }
};

vectors.blocks = vectors.blocks.map((block) => {
  const fields = vectorsBanglaBlocks[block.id];
  return fields ? { ...block, translations: { bn: { title: "", summary: "", fields } } } as LessonBlock : block;
});

const gradientDescent: Lesson = {
  id: "derivatives-and-gradient-descent",
  title: "Derivatives and gradient descent",
  summary: "Use the slope of a loss function to improve model parameters step by step.",
  objectives: ["Explain a derivative as a slope", "Perform gradient-descent updates by hand", "Describe the effect of the learning rate"],
  prerequisites: ["vectors-and-dot-products"],
  difficulty: "beginner",
  tags: ["calculus", "optimization"],
  estimatedMinutes: 60,
  version: 1,
  relatedTopicIds: ["workbook-LRN-005", "topic-3"],
  glossary: [
    { term: "Derivative", definition: "The instantaneous rate of change of a function; the slope of its tangent line." },
    { term: "Gradient", definition: "The vector of partial derivatives; it points in the direction of steepest increase." },
    { term: "Learning rate (η)", definition: "The step size used in each gradient-descent update." },
    { term: "Loss function", definition: "A number measuring how wrong a model's predictions are; training tries to minimize it." }
  ],
  translations: {},
  blocks: [
    text("intuition", "Intuition first", "Imagine standing on a hillside in fog and wanting to reach the valley floor. You can feel which way the ground slopes under your feet. Taking a small step downhill, again and again, will usually bring you lower.\n\nTraining a model works the same way. The *loss* is the height, the *parameters* are your position, and the **derivative** (or gradient, when there are many parameters) tells you which way is uphill. Gradient descent steps the opposite way."),
    text("formal", "Definitions", "For $f(x) = x^2$ the derivative is $f'(x) = 2x$. The gradient-descent update with learning rate $\\eta$ is:\n\n$$x_{t+1} = x_t - \\eta\\, f'(x_t)$$\n\nWith many parameters $\\theta$, the same rule uses the gradient: $\\theta \\leftarrow \\theta - \\eta\\,\\nabla L(\\theta)$."),
    { id: "diagram", type: "diagram", diagramId: "gradient-descent-loop", prompt: "Reveal the loop step by step. Which step uses the learning rate?" },
    text("worked", "Worked example", "Minimize $f(x) = x^2$ starting at $x_0 = 3$ with $\\eta = 0.1$.\n\n| step | $x_t$ | $f'(x_t) = 2x_t$ | $x_{t+1} = x_t - 0.1 \\cdot 2x_t$ |\n|---|---|---|---|\n| 0 | 3 | 6 | 2.4 |\n| 1 | 2.4 | 4.8 | 1.92 |\n| 2 | 1.92 | 3.84 | 1.536 |\n\nEach step multiplies $x$ by $(1 - 2\\eta) = 0.8$, so $x_t = 3 \\cdot 0.8^t$ moves steadily towards the minimum at 0.", "worked-example"),
    callout("warning", "warning", "For this function, any $\\eta > 1$ gives $|1 - 2\\eta| > 1$, so each step *overshoots further* and $x$ diverges. Real loss surfaces are more complex, but the lesson holds: a learning rate that is too large can make training unstable."),
    { id: "video", type: "video", title: "Gradient descent, how neural networks learn", url: "https://www.youtube.com/watch?v=IHZwWFHWa-w", provider: "youtube", youtubeId: "IHZwWFHWa-w", embedAllowed: true, publisher: "3Blue1Brown", license: "Standard YouTube licence — embedded via YouTube's player, not redistributed", chapters: [], keyConcepts: ["Cost function", "Negative gradient as the downhill direction"], followUpQuestions: ["What does the cost function measure for a digit classifier?"] },
    { id: "checkpoint", type: "checkpoint", prompt: "Pause and predict: starting at $x_0 = -2$ with $\\eta = 0.25$, what is $x_1$? (Answer: $-2 - 0.25 \\cdot (-4) = -1$.)" },
    { id: "guided", type: "exercise", kind: "guided", title: "Guided: three steps of gradient descent", prompt: "Starting from $x_0 = 3$ with $\\eta = 0.1$ on $f(x) = x^2$, what is $x_3$?", steps: ["Compute the multiplier $1 - 2\\eta$.", "Apply it three times to $x_0$."], hints: ["Use the table in the worked example."], solution: "$x_3 = 3 \\cdot 0.8^3 = 1.536$.", check: { kind: "numeric", answer: "1.536", tolerance: 0.0005 } },
    { id: "independent", type: "exercise", kind: "independent", title: "Independent: find the divergence threshold", prompt: "For $f(x) = x^2$, what is the largest learning rate for which gradient descent does **not** diverge from a non-zero start? (Assume a constant learning rate.)", steps: [], hints: ["The update multiplies $x$ by $1 - 2\\eta$. When does $|1 - 2\\eta| \\le 1$?"], solution: "$|1 - 2\\eta| \\le 1 \\iff 0 \\le \\eta \\le 1$. At $\\eta = 1$ the iterate oscillates between $x_0$ and $-x_0$ without diverging; above 1 it diverges. The threshold is **1**.", check: { kind: "numeric", answer: "1", tolerance: 0 } },
    { id: "after-check", type: "quiz", title: "Check your understanding", phase: "after", questions: [
      { id: "q1", prompt: "What is the derivative of $f(x) = 3x^2 + 2x$ at $x = 1$?", kind: "numeric", options: [], answer: ["8"], tolerance: 0, hint: "$f'(x) = 6x + 2$.", explanation: "$6 \\cdot 1 + 2 = 8$." },
      { id: "q2", prompt: "Gradient descent moves parameters in which direction?", kind: "single", options: ["Along the gradient", "Opposite to the gradient", "Perpendicular to the gradient", "Randomly"], answer: ["Opposite to the gradient"], hint: "", explanation: "The gradient points uphill; we subtract it to go downhill." },
      { id: "q3", prompt: "Which are common symptoms of a learning rate that is too large?", kind: "multiple", options: ["Loss increases or oscillates", "Loss becomes NaN", "Training is slow but steady", "Loss decreases smoothly"], answer: ["Loss increases or oscillates", "Loss becomes NaN"], hint: "", explanation: "Steps that are too large overshoot the minimum, so the loss can rise, oscillate, or overflow to NaN." }
    ] },
    { id: "reflect", type: "reflection", prompt: "Explain gradient descent in two sentences to a colleague who has never trained a model." },
    { id: "reading", type: "reading", items: [
      { title: "Machine Learning Crash Course: gradient descent", url: "https://developers.google.com/machine-learning/crash-course/linear-regression/gradient-descent", publisher: "Google for Developers", kind: "course", license: "CC BY 4.0 (content), per Google Developers site policies", note: "" },
      { title: "torch.optim documentation", url: "https://pytorch.org/docs/stable/optim.html", publisher: "PyTorch", kind: "documentation", license: "BSD-style (PyTorch)", note: "How optimizers implement update rules in practice." }
    ], title: "Further reading" }
  ]
};

const bayes: Lesson = {
  id: "probability-and-bayes",
  title: "Conditional probability and Bayes' theorem",
  summary: "Update beliefs with evidence and avoid the base-rate fallacy — essential for classifiers, spam filters, and lead scoring.",
  objectives: ["Compute a conditional probability", "Apply Bayes' theorem to a diagnostic-test scenario", "Explain why base rates matter"],
  prerequisites: [],
  difficulty: "beginner",
  tags: ["probability", "statistics"],
  estimatedMinutes: 50,
  version: 1,
  relatedTopicIds: ["workbook-LRN-004"],
  glossary: [
    { term: "Conditional probability", definition: "P(A | B): the probability of A given that B has occurred." },
    { term: "Prior", definition: "The probability of a hypothesis before seeing the evidence (the base rate)." },
    { term: "Posterior", definition: "The updated probability of the hypothesis after seeing the evidence." }
  ],
  translations: {},
  blocks: [
    text("intuition", "Intuition first", "Suppose a rare condition affects 1 in 100 people and a test catches it 99% of the time. If the test says *positive*, are you 99% likely to have it? Usually **no** — because the test also gives false alarms to the 99 healthy people, and they vastly outnumber the 1 sick person. Bayes' theorem makes this precise."),
    text("formal", "Bayes' theorem", "$$P(H \\mid E) = \\frac{P(E \\mid H)\\,P(H)}{P(E)},\\qquad P(E) = P(E\\mid H)P(H) + P(E\\mid \\neg H)P(\\neg H)$$"),
    text("worked", "Worked example: a medical test", "Prevalence $P(D) = 0.01$, sensitivity $P(+\\mid D) = 0.99$, false-positive rate $P(+\\mid \\neg D) = 0.05$.\n\n1. $P(+\\mid D)P(D) = 0.99 \\times 0.01 = 0.0099$\n2. $P(+\\mid\\neg D)P(\\neg D) = 0.05 \\times 0.99 = 0.0495$\n3. $P(+) = 0.0099 + 0.0495 = 0.0594$\n4. $P(D\\mid +) = 0.0099 / 0.0594 = 1/6 \\approx 0.1667$\n\nOnly about **16.7%** of positive results are true positives.", "worked-example"),
    callout("misconception", "misconception", "Confusing $P(E\\mid H)$ with $P(H\\mid E)$ is called the *base-rate fallacy*. A 99%-sensitive test does not mean a positive result is 99% reliable."),
    { id: "guided", type: "exercise", kind: "guided", title: "Guided: a spam filter", prompt: "20% of emails are spam. The word 'invoice' appears in 50% of spam and 5% of non-spam emails. What is $P(\\text{spam} \\mid \\text{'invoice'})$? Give 3 decimal places.", steps: ["Numerator: $0.5 \\times 0.2$", "Evidence: $0.5 \\times 0.2 + 0.05 \\times 0.8$", "Divide"], hints: ["$P(\\text{not spam}) = 0.8$."], solution: "$0.1 / (0.1 + 0.04) = 0.1/0.14 \\approx 0.714$.", check: { kind: "numeric", answer: "0.714", tolerance: 0.0006 } },
    { id: "after-check", type: "quiz", title: "Check your understanding", phase: "after", questions: [
      { id: "q1", prompt: "If $P(A \\cap B) = 0.12$ and $P(B) = 0.4$, what is $P(A\\mid B)$?", kind: "numeric", options: [], answer: ["0.3"], tolerance: 0.0001, hint: "$P(A\\mid B) = P(A\\cap B)/P(B)$.", explanation: "0.12 / 0.4 = 0.3." },
      { id: "q2", prompt: "Lowering the prevalence of a condition (keeping the test unchanged) makes a positive result…", kind: "single", options: ["more likely to be a true positive", "less likely to be a true positive", "no different"], answer: ["less likely to be a true positive"], hint: "", explanation: "With fewer true cases, false positives make up a larger share of all positives." }
    ] },
    { id: "reflect", type: "reflection", prompt: "A lead-scoring model flags 'high intent' leads. Why should you know the base rate of buyers before trusting a flag?" },
    { id: "reading", type: "reading", items: [
      { title: "Seeing Theory: Bayesian inference (interactive)", url: "https://seeing-theory.brown.edu/bayesian-inference/index.html", publisher: "Brown University", kind: "tutorial", license: "CC BY-SA 4.0 (per site)", note: "" }
    ], title: "Further reading" }
  ]
};

const leakage: Lesson = {
  id: "train-test-split-and-leakage",
  title: "Train/test splits and data leakage",
  summary: "Estimate real-world performance honestly by keeping evaluation data unseen during training and preprocessing.",
  objectives: ["Explain why a held-out test set is needed", "Identify common sources of leakage", "Build a leakage-safe scikit-learn pipeline"],
  prerequisites: [],
  difficulty: "beginner",
  tags: ["machine learning", "evaluation"],
  estimatedMinutes: 55,
  version: 1,
  relatedTopicIds: ["topic-2", "workbook-LRN-010"],
  glossary: [
    { term: "Data leakage", definition: "Information from outside the training data (often the test set or the future) influencing the model, making evaluation over-optimistic." },
    { term: "Validation set", definition: "Data used to choose models and hyperparameters; distinct from the final test set." }
  ],
  translations: {},
  blocks: [
    { id: "pre-check", type: "quiz", title: "Before you start", phase: "before", questions: [
      { id: "q-pre-1", prompt: "Is it acceptable to compute the mean used for feature scaling from the whole dataset before splitting?", kind: "true-false", options: [], answer: ["false"], hint: "", explanation: "The mean would include test rows, leaking information about the test set into training." }
    ] },
    text("intuition", "Intuition first", "A model that has seen the exam questions will ace the exam without having learned anything. **Leakage** is any way the 'exam' — your evaluation data — sneaks into training. The result is a model that looks excellent offline and disappoints in production."),
    { id: "diagram", type: "diagram", diagramId: "ml-pipeline", prompt: "At which step must preprocessing be fitted, and on which data?" },
    text("sources", "Common sources of leakage", "- **Preprocessing fitted on all data** — scalers, imputers, or vocabularies computed before splitting.\n- **Target leakage** — a feature that is only known *after* the outcome (e.g. `refund_issued` when predicting fraud).\n- **Duplicates across splits** — the same customer or near-identical rows in both train and test.\n- **Time leakage** — random splits of time-ordered data let the model use the future to predict the past."),
    { id: "code", type: "code", language: "python", caption: "A Pipeline fits the scaler on training data only, including inside cross-validation", code: "from sklearn.datasets import load_breast_cancer\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score, train_test_split\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\n\nX, y = load_breast_cancer(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, stratify=y, random_state=0\n)\n\nmodel = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))\nprint(cross_val_score(model, X_train, y_train, cv=5).mean())  # model selection\nmodel.fit(X_train, y_train)\nprint(model.score(X_test, y_test))  # final estimate, used once" },
    callout("tip", "tip", "Wrap preprocessing and the model in one `Pipeline`. Cross-validation then refits the preprocessing inside every fold automatically."),
    { id: "independent", type: "exercise", kind: "independent", title: "Independent: spot the leak", prompt: "A churn model uses the feature `days_since_cancellation_request`. It reaches 99% accuracy offline. Explain in one or two sentences why this is suspicious and what to do.", steps: [], hints: ["When is this value known relative to the outcome?"], solution: "The feature exists only after a customer has started cancelling, so it encodes the label (target leakage). Remove it, or rebuild features using only information available at prediction time." },
    { id: "practical", type: "exercise", kind: "practical", title: "Practical: a leakage-safe baseline", prompt: "Using a public tabular dataset, build a baseline classifier with a `Pipeline`, report cross-validated scores on the training set, and evaluate once on a held-out test set. Record the repository URL as evidence on the topic page.", steps: ["Split first, with stratification", "Use a Pipeline for preprocessing + model", "Report CV mean and standard deviation", "Evaluate once on test"], hints: [], solution: "Evidence: a notebook or script showing the split, pipeline, CV results, and a single test evaluation." },
    { id: "after-check", type: "quiz", title: "Check your understanding", phase: "after", questions: [
      { id: "q1", prompt: "Which of these cause data leakage?", kind: "multiple", options: ["Fitting a scaler on the full dataset before splitting", "Randomly splitting time-series data", "Using a Pipeline inside cross-validation", "Having the same customer in train and test"], answer: ["Fitting a scaler on the full dataset before splitting", "Randomly splitting time-series data", "Having the same customer in train and test"], hint: "", explanation: "A Pipeline inside cross-validation *prevents* leakage; the other three introduce it." },
      { id: "q2", prompt: "How many times should the final test set be used for evaluation?", kind: "single", options: ["Once, at the end", "Once per hyperparameter setting", "Whenever the validation score changes"], answer: ["Once, at the end"], hint: "", explanation: "Repeated use for decisions turns the test set into a validation set." }
    ] },
    { id: "reading", type: "reading", items: [
      { title: "Common pitfalls and recommended practices", url: "https://scikit-learn.org/stable/common_pitfalls.html", publisher: "scikit-learn", kind: "documentation", license: "BSD-3-Clause", note: "Covers data leakage and inconsistent preprocessing." },
      { title: "Cross-validation: evaluating estimator performance", url: "https://scikit-learn.org/stable/modules/cross_validation.html", publisher: "scikit-learn", kind: "documentation", license: "BSD-3-Clause", note: "" }
    ], title: "Further reading" }
  ]
};

const metrics: Lesson = {
  id: "classification-metrics",
  title: "Precision, recall, and choosing a metric",
  summary: "Read a confusion matrix and choose metrics that reflect the real cost of each mistake.",
  objectives: ["Compute accuracy, precision, recall, and F1 from a confusion matrix", "Explain why accuracy misleads on imbalanced data", "Choose a metric for a business scenario"],
  prerequisites: ["train-test-split-and-leakage"],
  difficulty: "beginner",
  tags: ["evaluation"],
  estimatedMinutes: 50,
  version: 1,
  relatedTopicIds: ["topic-2", "workbook-LRN-010"],
  glossary: [
    { term: "Precision", definition: "TP / (TP + FP): of the items flagged positive, the share that really are positive." },
    { term: "Recall", definition: "TP / (TP + FN): of the real positives, the share the model found." },
    { term: "F1 score", definition: "The harmonic mean of precision and recall: 2PR / (P + R)." }
  ],
  translations: {},
  blocks: [
    text("formal", "Definitions", "From a confusion matrix with true positives (TP), false positives (FP), false negatives (FN), and true negatives (TN):\n\n$$\\text{precision} = \\frac{TP}{TP+FP}\\quad \\text{recall} = \\frac{TP}{TP+FN}\\quad F_1 = \\frac{2PR}{P+R}\\quad \\text{accuracy} = \\frac{TP+TN}{TP+FP+FN+TN}$$"),
    text("worked", "Worked example", "TP = 40, FP = 10, FN = 20, TN = 930 (1,000 examples, 60 real positives).\n\n- Precision = 40 / 50 = **0.80**\n- Recall = 40 / 60 ≈ **0.667**\n- F1 = 2 · 0.8 · 0.667 / (0.8 + 0.667) ≈ **0.727**\n- Accuracy = 970 / 1000 = **0.97**\n\nAccuracy is 97% even though the model misses one third of positives. A model that always predicts *negative* would score 94%.", "worked-example"),
    { id: "diagram", type: "diagram", diagramId: "metric-choice", prompt: "Follow the tree for a fraud detector where missing fraud is very costly." },
    { id: "guided", type: "exercise", kind: "guided", title: "Guided: compute recall", prompt: "TP = 30, FP = 20, FN = 10, TN = 140. What is the recall? Give 2 decimal places.", steps: ["Recall uses TP and FN", "30 / (30 + 10)"], hints: [], solution: "30 / 40 = **0.75**.", check: { kind: "numeric", answer: "0.75", tolerance: 0.005 } },
    { id: "after-check", type: "quiz", title: "Check your understanding", phase: "after", questions: [
      { id: "q1", prompt: "TP = 30, FP = 20, FN = 10, TN = 140. What is the precision?", kind: "numeric", options: [], answer: ["0.6"], tolerance: 0.001, hint: "TP / (TP + FP).", explanation: "30 / 50 = 0.6." },
      { id: "q2", prompt: "A lead-qualification model passes leads to an expensive human sales call. Wasted calls are the main cost. Which metric matters most?", kind: "single", options: ["Precision", "Recall", "Accuracy"], answer: ["Precision"], hint: "", explanation: "Wasted calls are false positives, so precision — the share of flagged leads that are real — matters most." }
    ] },
    { id: "reflect", type: "reflection", prompt: "For your AI Sales Employee, which mistake is worse: contacting an uninterested lead, or missing an interested one? How would that change your metric?" },
    { id: "reading", type: "reading", items: [
      { title: "Metrics and scoring: quantifying the quality of predictions", url: "https://scikit-learn.org/stable/modules/model_evaluation.html", publisher: "scikit-learn", kind: "documentation", license: "BSD-3-Clause", note: "" },
      { title: "Classification: accuracy, recall, precision", url: "https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall", publisher: "Google for Developers", kind: "course", license: "CC BY 4.0 (content)", note: "" }
    ], title: "Further reading" }
  ]
};

const neurons: Lesson = {
  id: "neurons-and-networks",
  title: "Neurons, activations, and small networks",
  summary: "Compute a neuron's output by hand and see how layers of neurons form a network.",
  objectives: ["Compute a neuron's weighted sum and activation", "Compare sigmoid and ReLU", "Describe a forward pass through a small network"],
  prerequisites: ["vectors-and-dot-products", "derivatives-and-gradient-descent"],
  difficulty: "beginner",
  tags: ["deep learning", "neural networks"],
  estimatedMinutes: 60,
  version: 1,
  relatedTopicIds: ["topic-3", "workbook-LRN-012"],
  glossary: [
    { term: "Activation function", definition: "A non-linear function applied to a neuron's weighted sum, such as ReLU or sigmoid." },
    { term: "Sigmoid", definition: "σ(z) = 1 / (1 + e^(−z)); maps any real number into (0, 1)." },
    { term: "ReLU", definition: "max(0, z); passes positive values unchanged and zeroes negatives." }
  ],
  translations: {},
  blocks: [
    text("formal", "One neuron", "A neuron computes a weighted sum (a dot product plus a bias) and applies an activation $g$:\n\n$$z = \\mathbf{w}\\cdot\\mathbf{x} + b,\\qquad a = g(z),\\qquad \\sigma(z) = \\frac{1}{1+e^{-z}},\\qquad \\text{ReLU}(z) = \\max(0, z)$$"),
    text("worked", "Worked example", "With $\\mathbf{w} = [0.5, -1]$, $b = 0.1$, and $\\mathbf{x} = [2, 1]$:\n\n1. $z = 0.5\\cdot2 + (-1)\\cdot1 + 0.1 = 0.1$\n2. Sigmoid: $\\sigma(0.1) = 1/(1 + e^{-0.1}) \\approx 0.5250$\n3. ReLU: $\\max(0, 0.1) = 0.1$\n\n0.5250 is rounded; $e^{-0.1} \\approx 0.904837$.", "worked-example"),
    { id: "diagram", type: "diagram", diagramId: "neural-network-2-3-1", prompt: "Count the weights: how many connections join the input layer to the hidden layer?" },
    { id: "video", type: "video", title: "But what is a neural network?", url: "https://www.youtube.com/watch?v=aircAruvnKk", provider: "youtube", youtubeId: "aircAruvnKk", embedAllowed: true, publisher: "3Blue1Brown", license: "Standard YouTube licence — embedded via YouTube's player, not redistributed", chapters: [], keyConcepts: ["Neurons hold numbers", "Layers, weights and biases"], followUpQuestions: ["Why does a network need a non-linear activation?"] },
    { id: "code", type: "code", language: "python", caption: "The 2-3-1 network from the diagram in PyTorch", code: "import torch\nfrom torch import nn\n\nmodel = nn.Sequential(\n    nn.Linear(2, 3),   # 2 inputs -> 3 hidden units (6 weights + 3 biases)\n    nn.ReLU(),\n    nn.Linear(3, 1),   # 3 hidden -> 1 output (3 weights + 1 bias)\n    nn.Sigmoid(),\n)\nx = torch.tensor([[2.0, 1.0]])\nprint(model(x))                                   # a probability in (0, 1)\nprint(sum(p.numel() for p in model.parameters()))  # 13 parameters" },
    { id: "guided", type: "exercise", kind: "guided", title: "Guided: a ReLU neuron", prompt: "With $\\mathbf{w} = [1, 2]$, $b = -4$, and $\\mathbf{x} = [1, 1]$, what does a ReLU neuron output?", steps: ["$z = 1 + 2 - 4$", "Apply $\\max(0, z)$"], hints: [], solution: "$z = -1$, so ReLU outputs **0**.", check: { kind: "numeric", answer: "0", tolerance: 0 } },
    { id: "after-check", type: "quiz", title: "Check your understanding", phase: "after", questions: [
      { id: "q1", prompt: "How many trainable parameters does `nn.Linear(4, 2)` have?", kind: "numeric", options: [], answer: ["10"], tolerance: 0, hint: "Weights plus biases.", explanation: "4 × 2 weights + 2 biases = 10." },
      { id: "q2", prompt: "Without non-linear activations, a stack of linear layers is equivalent to…", kind: "single", options: ["a single linear layer", "a decision tree", "a recurrent network"], answer: ["a single linear layer"], hint: "", explanation: "Composing linear maps gives another linear map, so depth adds no expressive power without non-linearity." }
    ] },
    { id: "reading", type: "reading", items: [
      { title: "Build the neural network (PyTorch tutorial)", url: "https://pytorch.org/tutorials/beginner/basics/buildmodel_tutorial.html", publisher: "PyTorch", kind: "tutorial", license: "BSD-style (PyTorch tutorials)", note: "" },
      { title: "Practical Deep Learning for Coders", url: "https://course.fast.ai/", publisher: "fast.ai", kind: "course", license: "Free online course — link only", note: "" }
    ], title: "Further reading" }
  ]
};

const attention: Lesson = {
  id: "attention-intuition",
  title: "Self-attention: queries, keys, and values",
  summary: "Understand the scaled dot-product attention at the heart of transformer language models.",
  objectives: ["State the scaled dot-product attention formula", "Compute attention weights for a tiny example", "Explain the purpose of the causal mask"],
  prerequisites: ["vectors-and-dot-products", "neurons-and-networks"],
  difficulty: "intermediate",
  tags: ["transformers", "LLMs"],
  estimatedMinutes: 70,
  version: 1,
  relatedTopicIds: ["topic-4", "workbook-LRN-015"],
  glossary: [
    { term: "Query, key, value", definition: "Learned projections of each token: queries look for relevant keys; the matching values are averaged." },
    { term: "Softmax", definition: "Turns a vector of scores into positive weights that sum to 1." },
    { term: "Causal mask", definition: "Blocks attention to future positions so a decoder can only use earlier tokens." }
  ],
  translations: {},
  blocks: [
    text("intuition", "Intuition first", "When reading *'The customer asked for a discount because it was over budget'*, you resolve *'it'* by looking back at earlier words. Self-attention lets every token **ask a question** (its query), compare it with what every other token **offers** (its key), and take a weighted average of their **content** (values)."),
    text("formal", "Scaled dot-product attention", "$$\\operatorname{Attention}(Q, K, V) = \\operatorname{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V$$\n\nDividing by $\\sqrt{d_k}$ keeps the scores from growing with the vector dimension, which would otherwise push softmax into regions with tiny gradients."),
    text("worked", "Worked example", "One query $q = [1, 0]$ and two keys $k_1 = [1, 0]$, $k_2 = [0, 1]$, with $d_k = 2$.\n\n1. Scores: $q\\cdot k_1 = 1$, $q\\cdot k_2 = 0$; scaled by $1/\\sqrt2$: $[0.7071, 0]$.\n2. Softmax: $e^{0.7071} \\approx 2.0281$, $e^0 = 1$; weights $\\approx [2.0281/3.0281,\\ 1/3.0281] = [0.6698, 0.3302]$.\n3. With values $v_1 = [10, 0]$ and $v_2 = [0, 10]$, the output is $\\approx [6.698, 3.302]$.\n\nAll values are rounded to 4 significant decimals.", "worked-example"),
    { id: "diagram", type: "diagram", diagramId: "attention-block", prompt: "Reveal the block step by step. Where does the causal mask act, and why before softmax?" },
    callout("misconception", "misconception", "Attention weights are **not** a reliable explanation of *why* a model produced an output. They show where information was mixed in one layer and one head, not the full computation."),
    { id: "independent", type: "exercise", kind: "independent", title: "Independent: attention weights", prompt: "Scores (already scaled) for one query are $[2, 0, 0]$. What is the softmax weight on the first position? Give 4 decimal places.", steps: [], hints: ["$e^2 \\approx 7.3891$."], solution: "$e^2/(e^2 + 1 + 1) \\approx 7.3891/9.3891 \\approx 0.7870$.", check: { kind: "numeric", answer: "0.7870", tolerance: 0.0005 } },
    { id: "after-check", type: "quiz", title: "Check your understanding", phase: "after", questions: [
      { id: "q1", prompt: "In a decoder, what does the causal mask prevent?", kind: "single", options: ["Attending to future tokens", "Attending to the current token", "Using positional information", "Using more than one head"], answer: ["Attending to future tokens"], hint: "", explanation: "Masked scores are set to −∞, which become zero weight after softmax." },
      { id: "q2", prompt: "The weights produced by softmax for one query always sum to 1.", kind: "true-false", options: [], answer: ["true"], hint: "", explanation: "Softmax normalizes by the sum of exponentials." }
    ] },
    { id: "reading", type: "reading", items: [
      { title: "Attention Is All You Need", url: "https://arxiv.org/abs/1706.03762", publisher: "Vaswani et al., 2017 (arXiv)", kind: "paper", license: "arXiv non-exclusive licence — link only", note: "The original transformer paper." },
      { title: "Hugging Face LLM Course", url: "https://huggingface.co/learn/llm-course", publisher: "Hugging Face", kind: "course", license: "Apache-2.0 (course repository)", note: "" }
    ], title: "Further reading" }
  ]
};

const agents: Lesson = {
  id: "tool-calling-agents",
  title: "Tool-calling agents with human approval",
  summary: "Design an agent loop that validates tool calls and pauses for a person before consequential actions — the backbone of an AI Sales Employee.",
  objectives: ["Describe the agent loop", "Validate tool arguments against a schema", "Decide which actions require human approval"],
  prerequisites: ["attention-intuition"],
  difficulty: "intermediate",
  tags: ["agents", "tool calling", "AI sales"],
  estimatedMinutes: 75,
  version: 1,
  relatedTopicIds: ["topic-7", "topic-8", "workbook-LRN-024", "workbook-LRN-028"],
  glossary: [
    { term: "Tool call", definition: "A structured request from the model to run a function you define, with arguments." },
    { term: "Human-in-the-loop", definition: "A checkpoint where a person approves, edits, or rejects an action before it takes effect." },
    { term: "Idempotency", definition: "Repeating an operation has the same effect as doing it once — important when retries happen." }
  ],
  translations: {},
  blocks: [
    text("intuition", "Intuition first", "A language model on its own can only produce text. An **agent** wraps the model in a loop: the model proposes actions (tool calls), your code checks and runs them, and the results go back to the model. *Your code*, not the model, decides what is actually allowed to happen."),
    { id: "diagram", type: "diagram", diagramId: "agent-tool-loop", prompt: "Which steps are performed by your code rather than by the model?" },
    { id: "code", type: "code", language: "python", caption: "Validate arguments and gate consequential tools (framework-independent sketch)", code: "from pydantic import BaseModel, Field, ValidationError\n\nclass DraftQuote(BaseModel):\n    company_id: str\n    product_sku: str\n    quantity: int = Field(gt=0, le=10_000)\n    discount_percent: float = Field(ge=0, le=15)  # business rule: max 15%\n\nCONSEQUENTIAL = {\"send_email\", \"send_quote\", \"create_order\"}\n\ndef handle_tool_call(name: str, raw_args: dict, approve) -> dict:\n    if name == \"draft_quote\":\n        try:\n            args = DraftQuote.model_validate(raw_args)\n        except ValidationError as error:\n            return {\"error\": error.errors()}      # returned to the model, not raised\n        return {\"draft\": args.model_dump()}\n    if name in CONSEQUENTIAL:\n        if not approve(name, raw_args):          # a person decides\n            return {\"error\": \"Rejected by a human reviewer.\"}\n        ...  # perform the action idempotently\n    return {\"error\": f\"Unknown tool: {name}\"}" },
    callout("warning", "warning", "Never let a model directly send messages, commit prices, or create orders. Validate every argument, enforce business limits in code, require human approval for consequential actions, and log every step for audit."),
    { id: "er", type: "diagram", diagramId: "sales-crm-er", prompt: "Which entity records who approved a quotation?" },
    { id: "independent", type: "exercise", kind: "independent", title: "Independent: classify actions", prompt: "List which of these sales-agent actions should require human approval and why: (a) look up a product price, (b) send a quotation email, (c) summarize a call transcript, (d) apply a 20% discount.", steps: [], hints: ["Ask: does it have an external effect or a commercial commitment?"], solution: "(b) and (d) require approval: sending email has an external effect, and a 20% discount exceeds a typical policy limit and commits the business. (a) and (c) are read-only or internal and can run automatically, though their results should still be logged." },
    { id: "practical", type: "exercise", kind: "practical", title: "Practical: a mocked tool-calling loop", prompt: "Build a deterministic agent loop with two mocked tools (`lookup_product`, `draft_quote`) and one consequential tool (`send_quote`) that requires an approval callback. Write tests showing that invalid arguments and rejected approvals are handled.", steps: ["Define schemas for each tool", "Return validation errors to the loop instead of crashing", "Require approval for send_quote", "Add a maximum step count"], hints: [], solution: "Evidence: repository with the loop, tests for invalid arguments, rejected approval, and step limit." },
    { id: "after-check", type: "quiz", title: "Check your understanding", phase: "after", questions: [
      { id: "q1", prompt: "Who should enforce the maximum discount an agent may offer?", kind: "single", options: ["The system prompt", "Application code that validates tool arguments", "The model's own judgement"], answer: ["Application code that validates tool arguments"], hint: "", explanation: "Prompts can be ignored or manipulated; limits must be enforced in code." },
      { id: "q2", prompt: "Which actions should pause for human approval in an AI sales assistant?", kind: "multiple", options: ["Sending a quotation to a customer", "Searching the product catalogue", "Creating a sales order", "Summarizing an email thread"], answer: ["Sending a quotation to a customer", "Creating a sales order"], hint: "", explanation: "These have external effects or commercial commitments." }
    ] },
    { id: "reflect", type: "reflection", prompt: "What would you log for each tool call so that a manager could audit what the agent did and why?" },
    { id: "reading", type: "reading", items: [
      { title: "Function calling guide", url: "https://platform.openai.com/docs/guides/function-calling", publisher: "OpenAI", kind: "documentation", license: "Link only", note: "" },
      { title: "Hugging Face Agents Course", url: "https://huggingface.co/learn/agents-course", publisher: "Hugging Face", kind: "course", license: "Apache-2.0 (course repository)", note: "" },
      { title: "OWASP Top 10 for Large Language Model Applications", url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/", publisher: "OWASP", kind: "documentation", license: "CC BY-SA 4.0", note: "Prompt injection and excessive agency risks." }
    ], title: "Further reading" }
  ]
};

export function createSeedCourses(): Course[] {
  return courseSchema.array().parse([{
    id: "ai-engineering-foundations",
    title: "AI Engineering Foundations (introductory)",
    description: "An introductory, platform-authored course covering the mathematics, workflow, and building blocks behind modern AI systems — from dot products to tool-calling agents. **This is seed material: it gives a structured starting point and is not a comprehensive curriculum.** Each lesson links to official documentation and open courses for depth.",
    objectives: [
      "Use vectors, derivatives, and probability to reason about models",
      "Evaluate models honestly and choose suitable metrics",
      "Explain neurons, attention, and agent loops at a working level"
    ],
    prerequisites: ["Comfortable reading and writing Python", "High-school algebra"],
    difficulty: "beginner",
    tags: ["foundations", "mathematics", "machine learning", "agents"],
    category: "Foundations",
    language: "en",
    translations: {},
    provenance: "platform-authored",
    seed: true,
    version: 0,
    updatedAt: at,
    modules: [
      { id: "mathematics", title: "Mathematics you need for machine learning", description: "Vectors, derivatives, and probability with ML-focused examples.", lessons: [vectors, gradientDescent, bayes] },
      { id: "ml-workflow", title: "The machine-learning workflow", description: "Split data honestly and measure what matters.", lessons: [leakage, metrics] },
      { id: "networks-to-agents", title: "From neural networks to agents", description: "Neurons, attention, and safe tool-calling loops.", lessons: [neurons, attention, agents] }
    ]
  }]);
}
