import { SOCIAL_SCIENCE_CHAPTERS } from "@/lib/social-science-chapters";
/**
 * Canonical NCERT syllabus (Class 9–12) used by the Advanced NCERT Topic
 * Generator. Chapter names and subtopics come strictly from this catalog —
 * nothing else is offered in the dropdowns.
 */

import { ENGLISH_CHAPTERS } from "@/lib/english-chapters";

import { EXTRA_SUBTOPICS } from "@/lib/ncert-subtopics-extra";

export type SyllabusChapter = { chapter: string; subtopics: string[] };
export type ClassSyllabus = Record<string, SyllabusChapter[]>;

export const NCERT_SYLLABUS: Record<string, ClassSyllabus> = {
  "9": {
    "Social Science": SOCIAL_SCIENCE_CHAPTERS["9"],
    Mathematics: [
      { chapter: "Chapter 1: Number Systems", subtopics: ["Rational and irrational numbers", "Real numbers and their decimal expansions", "Representing real numbers on the number line", "Operations on real numbers", "Laws of exponents for real numbers"] },
      { chapter: "Chapter 2: Polynomials", subtopics: ["Polynomials in one variable", "Zeroes of a polynomial", "Remainder Theorem", "Factorisation of polynomials", "Algebraic identities"] },
      { chapter: "Chapter 3: Coordinate Geometry", subtopics: ["Cartesian system", "Plotting a point in the plane given its coordinates"] },
      { chapter: "Chapter 4: Linear Equations in Two Variables", subtopics: ["Linear equations", "Solution of a linear equation", "Graph of a linear equation in two variables", "Equations of lines parallel to the x-axis and y-axis"] },
      { chapter: "Chapter 5: Introduction to Euclid's Geometry", subtopics: ["History of geometry", "Euclid's method", "Euclid's axioms and postulates", "Equivalent versions of Euclid's fifth postulate"] },
      { chapter: "Chapter 6: Lines and Angles", subtopics: ["Basic terms and definitions", "Intersecting and non-intersecting lines", "Pairs of angles", "Parallel lines and a transversal", "Angle sum property of a triangle"] },
      { chapter: "Chapter 7: Triangles", subtopics: ["Congruence of triangles", "Criteria for congruence (SAS, ASA, SSS, RHS)", "Some properties of a triangle", "Inequalities in a triangle"] },
      { chapter: "Chapter 8: Quadrilaterals", subtopics: ["Angle sum property of a quadrilateral", "Types of quadrilaterals", "Properties of a parallelogram", "The mid-point theorem"] },
      { chapter: "Chapter 9: Circles", subtopics: ["Circles and their related terms", "Angle subtended by a chord at a point", "Perpendicular from the centre to a chord", "Equal chords and their distances from the centre", "Cyclic quadrilaterals"] },
      { chapter: "Chapter 10: Heron's Formula", subtopics: ["Area of a triangle using Heron's formula", "Application of Heron's formula in finding areas of quadrilaterals"] },
      { chapter: "Chapter 11: Surface Areas and Volumes", subtopics: ["Surface area and volume of a cuboid", "Cube", "Right circular cylinder", "Right circular cone", "Sphere"] },
      { chapter: "Chapter 12: Statistics", subtopics: ["Collection of data", "Presentation of data", "Graphical representation of statistical data", "Measures of central tendency (mean, median, mode)"] },
    ],
    Science: [
      { chapter: "Chapter 1: Matter in Our Surroundings (Chemistry)", subtopics: ["Physical nature of matter", "Characteristics of particles of matter", "States of matter (solid, liquid, gas)", "Change of state", "Evaporation"] },
      { chapter: "Chapter 2: Is Matter Around Us Pure? (Chemistry)", subtopics: ["What is a mixture?", "Types of mixtures", "Solutions", "Concentration of a solution", "Suspension", "Colloids", "Physical and chemical changes", "Pure substances (elements and compounds)"] },
      { chapter: "Chapter 3: Atoms and Molecules (Chemistry)", subtopics: ["Laws of chemical combination", "What is an atom?", "What is a molecule?", "Writing chemical formulae", "Molecular mass and mole concept"] },
      { chapter: "Chapter 4: Structure of the Atom (Chemistry)", subtopics: ["Charged particles in matter", "Structure of an atom (Thomson, Rutherford and Bohr models)", "Distribution of electrons in orbits", "Valency", "Atomic number and mass number", "Isotopes and isobars"] },
      { chapter: "Chapter 5: The Fundamental Unit of Life (Biology)", subtopics: ["What are living organisms made of?", "Plasma membrane", "Cell wall", "Nucleus", "Cytoplasm", "Cell organelles (ER, Golgi apparatus, lysosomes, mitochondria, plastids, vacuoles)"] },
      { chapter: "Chapter 6: Tissues (Biology)", subtopics: ["Plant tissues (meristematic and permanent)", "Animal tissues (epithelial, connective, muscular, nervous)"] },
      { chapter: "Chapter 7: Motion (Physics)", subtopics: ["Description of motion", "Rate of change of velocity", "Graphical representation of motion", "Equations of kinematic motion", "Uniform circular motion"] },
      { chapter: "Chapter 8: Force and Laws of Motion (Physics)", subtopics: ["Balanced and unbalanced forces", "First law of motion", "Inertia and mass", "Second law of motion", "Third law of motion", "Conservation of momentum"] },
      { chapter: "Chapter 9: Gravitation (Physics)", subtopics: ["Gravitation", "Universal law of gravitation", "Free fall", "Mass and weight", "Thrust and pressure", "Archimedes' principle", "Relative density"] },
      { chapter: "Chapter 10: Work and Energy (Physics)", subtopics: ["Work", "Kinetic energy", "Potential energy", "Rate of doing work (power)", "Transformation of energy"] },
      { chapter: "Chapter 11: Sound (Physics)", subtopics: ["Production of sound", "Propagation of sound", "Reflection of sound", "Range of hearing", "Applications of ultrasound", "Structure of human ear"] },
      { chapter: "Chapter 12: Improvement in Food Resources (Biology)", subtopics: ["Crop variety improvement", "Crop production management", "Protection management", "Animal husbandry (cattle, poultry, fish, bee-keeping)"] },
    ],
    "Computer Science": [
      { chapter: "Chapter 1: Computer System Overview", subtopics: ["Introduction to computers", "Hardware and software components", "Working of a computer", "Memory units"] },
      { chapter: "Chapter 2: Data Representation and Basic Software", subtopics: ["Binary number system", "System software", "Application software", "Operating systems"] },
      { chapter: "Chapter 3: Office Productivity Tools (Word Processing, Spreadsheets, Presentations)", subtopics: ["Creating documents", "Formatting text", "Tables", "Formulas in spreadsheets", "Slide creation and animations"] },
      { chapter: "Chapter 4: Cyber Safety and Security", subtopics: ["Safe web browsing", "Passwords", "Protecting personal data", "Cyberbullying", "Safe communication practices"] },
    ],
    English: ENGLISH_CHAPTERS["9"],
    Hindi: [
      { chapter: "क्षितिज भाग 1 (गद्य खंड एवं काव्य खंड)", subtopics: ["दो बैलों की कथा (प्रेमचंद)", "ल्हासा की ओर (राहुल सांकृत्यायन)", "साखियाँ एवं सबद (कबीर)", "वाख (ललद्यद)", "सवैये (रसखान)", "उपभोक्तावाद की संस्कृति (श्यामचरण दुबे)", "कैदी और कोकिला (माखनलाल चतुर्वेदी)", "ग्राम श्री (सुमित्रानंदन पंत)", "बच्चे काम पर जा रहे हैं (राजेश जोशी)", "प्रेमचंद के फटे जूते (हरिशंकर परसाई)", "मेरे बचपन के दिन (महादेवी वर्मा)", "एक कुत्ता और एक मैना (हजारीप्रसाद द्विवेदी)"] },
      { chapter: "कृतिका भाग 1", subtopics: ["इस जल प्रलय में (फणीश्वरनाथ रेणु)", "मेरे संग की औरतें (मृदुला गर्ग)", "रीढ़ की हड्डी (जगदीश चंद्र माथुर)", "माटी वाली (विद्यासागर नौटियाल)", "किस तरह आखिरकार मैं हिंदी में आया (शमशेर बहादुर सिंह)"] },
    ],
    Sanskrit: [
      { chapter: "शेमुषी भाग 1 (पाठ 1–12)", subtopics: ["भारतीवसन्तगीतिः", "स्वर्णकाकः", "गोदोहनम्", "सुभाषितरत्नानि", "भ्रान्तो बालः", "सिकतासेतुः", "जटायोः शौर्यम्", "पर्यावरणम्", "वाक्प्रसादः / सूक्तिमौक्तिकम्", "व्याकरण: सन्धि", "व्याकरण: समास", "व्याकरण: कारक", "व्याकरण: प्रत्यय एवं उपसर्ग", "शब्दरूप एवं धातुरूप"] },
    ],
  },

  "10": {
    "Social Science": SOCIAL_SCIENCE_CHAPTERS["10"],
    Mathematics: [
      { chapter: "Chapter 1: Real Numbers", subtopics: ["Fundamental Theorem of Arithmetic", "Revisiting rational and irrational numbers"] },
      { chapter: "Chapter 2: Polynomials", subtopics: ["Geometrical meaning of zeroes", "Relationship between zeroes and coefficients", "Division algorithm for polynomials"] },
      { chapter: "Chapter 3: Pair of Linear Equations in Two Variables", subtopics: ["Graphical method of solution", "Algebraic methods (substitution, elimination)", "Equations reducible to linear form"] },
      { chapter: "Chapter 4: Quadratic Equations", subtopics: ["Solution by factorization", "Quadratic formula", "Nature of roots"] },
      { chapter: "Chapter 5: Arithmetic Progressions", subtopics: ["Arithmetic progressions (APs)", "n-th term of an AP", "Sum of first n terms of an AP"] },
      { chapter: "Chapter 6: Triangles", subtopics: ["Similar figures", "Similarity criteria (AAA, SSS, SAS)", "Areas of similar triangles", "Pythagoras theorem"] },
      { chapter: "Chapter 7: Coordinate Geometry", subtopics: ["Distance formula", "Section formula", "Area of a triangle"] },
      { chapter: "Chapter 8: Introduction to Trigonometry", subtopics: ["Trigonometric ratios", "Ratios of specific angles", "Complementary angles", "Trigonometric identities"] },
      { chapter: "Chapter 9: Some Applications of Trigonometry", subtopics: ["Heights and distances", "Angles of elevation and depression"] },
      { chapter: "Chapter 10: Circles", subtopics: ["Tangent to a circle", "Number of tangents from a point", "Geometric theorems involving tangents"] },
      { chapter: "Chapter 11: Areas Related to Circles", subtopics: ["Perimeter and area of a circle", "Areas of sector and segment of a circle"] },
      { chapter: "Chapter 12: Surface Areas and Volumes", subtopics: ["Surface area and volume of combination of solids", "Conversion of solids", "Frustum of a cone"] },
      { chapter: "Chapter 13: Statistics", subtopics: ["Mean of grouped data", "Median of grouped data", "Mode of grouped data", "Cumulative frequency graphs"] },
      { chapter: "Chapter 14: Probability", subtopics: ["Theoretical probability", "Elementary events", "Complementary events"] },
    ],
    Science: [
      { chapter: "Chapter 1: Chemical Reactions and Equations (Chemistry)", subtopics: ["Chemical equations", "Types of reactions (combination, decomposition, displacement, double displacement)", "Oxidation and reduction", "Corrosion", "Rancidity"] },
      { chapter: "Chapter 2: Acids, Bases and Salts (Chemistry)", subtopics: ["Chemical properties of acids and bases", "pH scale", "Preparation and uses of important salts (NaOH, bleaching powder, baking soda, washing soda, plaster of paris)"] },
      { chapter: "Chapter 3: Metals and Non-metals (Chemistry)", subtopics: ["Physical and chemical properties", "Reactivity series", "Ionic compounds", "Extraction of metals", "Corrosion prevention"] },
      { chapter: "Chapter 4: Carbon and its Compounds (Chemistry)", subtopics: ["Covalent bonding", "Versatile nature of carbon", "Homologous series", "Chemical properties", "Ethanol and ethanoic acid", "Soaps and detergents"] },
      { chapter: "Chapter 5: Life Processes (Biology)", subtopics: ["Nutrition", "Respiration", "Transportation (human circulatory system)", "Excretion (nephrons)"] },
      { chapter: "Chapter 6: Control and Coordination (Biology)", subtopics: ["Nervous system", "Reflex action", "Human brain", "Plant hormones and tropic movements"] },
      { chapter: "Chapter 7: How do Organisms Reproduce? (Biology)", subtopics: ["Asexual reproduction", "Sexual reproduction", "Human reproductive system", "Reproductive health"] },
      { chapter: "Chapter 8: Heredity and Evolution (Biology)", subtopics: ["Mendel's laws of inheritance", "Sex determination", "Acquired and inherited traits"] },
      { chapter: "Chapter 9: Light – Reflection and Refraction (Physics)", subtopics: ["Reflection by spherical mirrors", "Refraction through glass slabs", "Lenses", "Lens formula", "Power of a lens"] },
      { chapter: "Chapter 10: The Human Eye and the Colourful World (Physics)", subtopics: ["Structure of human eye", "Defects of vision (myopia, hypermetropia)", "Prism refraction", "Dispersion", "Atmospheric scattering"] },
      { chapter: "Chapter 11: Electricity (Physics)", subtopics: ["Electric current", "Ohm's law", "Resistance", "Series and parallel combinations", "Heating effect", "Electric power"] },
      { chapter: "Chapter 12: Magnetic Effects of Electric Current (Physics)", subtopics: ["Magnetic field lines", "Magnetic force on current conductors", "Electromagnetic induction", "Domestic circuits"] },
      { chapter: "Chapter 13: Our Environment (Biology)", subtopics: ["Ecosystem dynamics", "Food chains and webs", "Biological magnification", "Ozone layer depletion"] },
    ],
    "Computer Science": [
      { chapter: "Chapter 1: Internet Basics and Web Services", subtopics: ["World Wide Web", "Web browsers", "Web servers", "Communication protocols (TCP/IP, HTTP, FTP)"] },
      { chapter: "Chapter 2: HTML Fundamentals & Cascading Style Sheets (CSS)", subtopics: ["Structure of HTML documents", "Formatting tags", "Lists", "Tables", "Links and images", "Adding CSS styles"] },
      { chapter: "Chapter 3: Cyber Ethics and Security", subtopics: ["Intellectual property rights", "Plagiarism", "Digital property rights", "Software licenses", "Secure online transactions"] },
      { chapter: "Chapter 4: Database Concepts (MySQL Basics)", subtopics: ["Introduction to DBMS", "Tables, rows, columns", "Data types", "Basic SQL queries (SELECT, INSERT, UPDATE)"] },
    ],
    English: ENGLISH_CHAPTERS["10"],
    Hindi: [
      { chapter: "क्षितिज भाग 2", subtopics: ["सूरदास (पद)", "तुलसीदास (राम-लक्ष्मण-परशुराम संवाद)", "देव (सवैया, कवित्त)", "जयशंकर प्रसाद (आत्मकथ्य)", "सूर्यकांत त्रिपाठी 'निराला' (उत्साह, अट नहीं रही है)", "नागार्जुन (यह दंतुरित मुस्कान, फसल)", "मंगलेश डबराल (संगतकार)", "स्वयं प्रकाश (नेताजी का चश्मा)", "रामवृक्ष बेनीपुरी (बालगोबिन भगत)", "यशपाल (लखनवी अंदाज़)", "मन्नू भंडारी (एक कहानी यह भी)", "महावीरप्रसाद द्विवेदी (स्त्री-शिक्षा के विरोधी कुतर्कों का खंडन)", "यतींद्र मिश्र (नौबतखाने में इबादत)", "आनंद यादव (संस्कृति)"] },
      { chapter: "कृतिका भाग 2", subtopics: ["माता का अँचल (शिवपूजन सहाय)", "जॉर्ज पंचम की नाक (कमलेश्वर)", "साना-साना हाथ जोड़ि (मधु कांकरिया)", "एही ठैयाँ झुलनी हेरानी हो रामा!", "किस तरह आखिरकार मैं हिंदी में आया"] },
    ],
    Sanskrit: [
      { chapter: "शेमुषी भाग 2 (पाठ 1–12)", subtopics: ["शुचिपर्यावरणम्", "बुद्धिर्बलवती सदा", "शिशुलालनम्", "जननी तुल्यवत्सला", "सुभाषितानि", "विचित्रः साक्षी", "प्रत्यभिज्ञानम्", "सूक्तयः", "वृत्तयः", "व्याकरण: सन्धि", "व्याकरण: समास", "व्याकरण: प्रत्यय", "व्याकरण: अव्यय", "वाक्य-शुद्धि एवं अनुवाद"] },
    ],
  },

  "11": {
    Mathematics: [
      { chapter: "Chapter 1: Sets", subtopics: ["Set theory", "Types of sets", "Venn diagrams", "Operations on sets", "Practical problems"] },
      { chapter: "Chapter 2: Relations and Functions", subtopics: ["Cartesian products", "Relations", "Functions", "Domain, co-domain and range"] },
      { chapter: "Chapter 3: Trigonometric Functions", subtopics: ["Angle measurement", "Trigonometric functions", "Graphs", "Identities"] },
      { chapter: "Chapter 4: Complex Numbers and Quadratic Equations", subtopics: ["Algebra of complex numbers", "Modulus", "Conjugate", "Argand plane"] },
      { chapter: "Chapter 5: Linear Inequalities", subtopics: ["Algebraic solutions of linear inequalities in one variable", "Graphical solutions in two variables"] },
      { chapter: "Chapter 6: Permutations and Combinations", subtopics: ["Fundamental principle of counting", "Permutations", "Combinations"] },
      { chapter: "Chapter 7: Binomial Theorem", subtopics: ["Binomial expansion for positive integers", "General term", "Middle term"] },
      { chapter: "Chapter 8: Sequences and Series", subtopics: ["Arithmetic progression (AP)", "Geometric progression (GP)", "Special series"] },
      { chapter: "Chapter 9: Straight Lines", subtopics: ["Slope of a line", "Equations of lines", "Distance between points and lines"] },
      { chapter: "Chapter 10: Conic Sections", subtopics: ["Circles", "Parabolas", "Ellipses", "Hyperbolas"] },
      { chapter: "Chapter 11: Introduction to Three Dimensional Geometry", subtopics: ["3D coordinate system", "Distance formula", "Section formula"] },
      { chapter: "Chapter 12: Limits and Derivatives", subtopics: ["Limits", "Derivatives of algebraic functions", "Derivatives of trigonometric functions"] },
      { chapter: "Chapter 13: Statistics", subtopics: ["Measures of dispersion", "Mean deviation", "Variance", "Standard deviation"] },
      { chapter: "Chapter 14: Probability", subtopics: ["Axiomatic approach", "Sample space", "Events", "Probability of events"] },
    ],
    Physics: [
      { chapter: "Chapter 1: Units and Measurement", subtopics: ["SI units", "Dimensional analysis", "Measurement errors", "Significant figures"] },
      { chapter: "Chapter 2: Motion in a Straight Line", subtopics: ["Position", "Velocity", "Acceleration", "Kinematic equations"] },
      { chapter: "Chapter 3: Motion in a Plane", subtopics: ["Vectors", "Projectile motion", "Uniform circular motion"] },
      { chapter: "Chapter 4: Laws of Motion", subtopics: ["Newton's laws", "Friction", "Circular dynamics"] },
      { chapter: "Chapter 5: Work, Energy and Power", subtopics: ["Work-energy theorem", "Conservative and non-conservative forces", "Collisions"] },
      { chapter: "Chapter 6: System of Particles and Rotational Motion", subtopics: ["Centre of mass", "Torque", "Angular momentum", "Moment of inertia", "Parallel and perpendicular axes theorems"] },
      { chapter: "Chapter 7: Gravitation", subtopics: ["Kepler's laws", "Universal law of gravitation", "Gravitational potential energy", "Escape velocity", "Satellites"] },
      { chapter: "Chapter 8: Mechanical Properties of Solids", subtopics: ["Elasticity", "Hooke's law", "Stress-strain curves", "Elastic moduli"] },
      { chapter: "Chapter 9: Mechanical Properties of Fluids", subtopics: ["Pascal's law", "Buoyancy", "Bernoulli's principle", "Surface tension", "Viscosity"] },
      { chapter: "Chapter 10: Thermal Properties of Matter", subtopics: ["Thermal expansion", "Calorimetry", "Heat transfer (conduction, convection, radiation)"] },
      { chapter: "Chapter 11: Thermodynamics", subtopics: ["Zeroth law", "First law", "Second law", "Thermodynamic processes", "Carnot engine"] },
      { chapter: "Chapter 12: Kinetic Theory", subtopics: ["Ideal gas laws", "Kinetic theory model", "Law of equipartition of energy"] },
      { chapter: "Chapter 13: Oscillations", subtopics: ["Simple harmonic motion (SHM)", "Energy in SHM", "Simple pendulum"] },
      { chapter: "Chapter 14: Waves", subtopics: ["Transverse and longitudinal waves", "Speed of waves", "Superposition", "Standing waves", "Doppler effect"] },
    ],
    Chemistry: [
      { chapter: "Chapter 1: Some Basic Concepts of Chemistry", subtopics: ["Mole concept", "Atomic mass", "Stoichiometric calculations", "Concentration terms"] },
      { chapter: "Chapter 2: Structure of Atom", subtopics: ["Subatomic particles", "Bohr model", "Quantum numbers", "Electronic configuration"] },
      { chapter: "Chapter 3: Classification of Elements and Periodicity in Properties", subtopics: ["Modern periodic table", "Periodic trends (atomic radius, ionization energy, electronegativity)"] },
      { chapter: "Chapter 4: Chemical Bonding and Molecular Structure", subtopics: ["VSEPR theory", "Valence bond theory", "Hybridization", "Molecular orbital theory"] },
      { chapter: "Chapter 5: Chemical Thermodynamics", subtopics: ["Enthalpy", "Entropy", "Gibbs free energy", "Spontaneity of processes"] },
      { chapter: "Chapter 6: Equilibrium", subtopics: ["Chemical equilibrium", "Le Chatelier's principle", "Ionic equilibrium", "Buffer solutions", "Solubility product"] },
      { chapter: "Chapter 7: Redox Reactions", subtopics: ["Oxidation numbers", "Balancing redox reactions", "Electrochemical titrations"] },
      { chapter: "Chapter 8: Organic Chemistry – Some Basic Principles and Techniques", subtopics: ["IUPAC nomenclature", "Isomerism", "Electron displacement effects", "Reaction intermediates"] },
      { chapter: "Chapter 9: Hydrocarbons", subtopics: ["Alkanes", "Alkenes", "Alkynes", "Aromatic hydrocarbons (benzene chemistry)"] },
    ],
    "Computer Science": [
      { chapter: "Chapter 1: Computer Systems and Organization", subtopics: ["CPU", "Memory", "Input/output devices", "Software types"] },
      { chapter: "Chapter 2: Encoding Schemes and Number Systems", subtopics: ["ASCII", "ISCII", "Unicode", "Binary, octal, hexadecimal conversions"] },
      { chapter: "Chapter 3: Getting Started with Python", subtopics: ["Interactive mode", "Script mode", "Variables", "Keywords", "Data types"] },
      { chapter: "Chapter 4: Control Statements", subtopics: ["Conditional execution (if, elif, else)", "Iteration loops (for, while)"] },
      { chapter: "Chapter 5: Functions", subtopics: ["Built-in functions", "User-defined functions", "Scope of variables"] },
      { chapter: "Chapter 6: Strings and Lists", subtopics: ["String manipulation", "List operations", "Traversal", "Built-in methods"] },
      { chapter: "Chapter 7: Tuples and Dictionaries", subtopics: ["Tuple immutability", "Dictionary key-value pair maps", "Dictionary methods"] },
      { chapter: "Chapter 8: Societal Impacts", subtopics: ["Digital footprint", "Cyber safety", "Intellectual property", "Open source philosophy"] },
    ],
    English: ENGLISH_CHAPTERS["11"],
    Hindi: [
      { chapter: "अंतरा भाग 1", subtopics: ["कबीर (पद)", "सूरदास (पद)", "मीराबाई (पद)", "रसखान (सवैये)", "घनानंद (कवित्त/सवैया)", "भवानीप्रसाद मिश्र (घर की याद)", "त्रिलोचन (चंपा काले काले अच्छर नहीं चीन्हती)", "नागार्जुन (बादल को घिरते देखा है)", "केदारनाथ अग्रवाल (सबसे सुंदरतम)", "कुंवर नारायण (घर वापसी)", "शमशेर बहादुर सिंह (तोहफा)", "दुष्यंत कुमार (साये में धूप)", "निर्मला पुतुल (आओ मिलें)", "प्रेमचंद (ईदगाह)", "अमरकांत (दोपहर का भोजन)", "हरिशंकर परसाई", "रांगेय राघव (उसकी माँ)", "निर्मल वर्मा (परिंदे)", "कृष्णा सोबती", "राहुल सांकृत्यायन"] },
      { chapter: "अंतराल भाग 1", subtopics: ["अंडे के छिलके (मोहन राकेश)", "आषाढ़ का एक दिन (मोहन राकेश का परिचय)", "उसकी माँ (रांगेय राघव)"] },
    ],
    Sanskrit: [
      { chapter: "भास्वती भाग 1 (पाठ 1–12)", subtopics: ["अनुशासनम्", "वेदामृतम्", "वाङ्मनःप्राणस्वरूपम्", "विज्ञाननौका", "कल्पतरुः", "महारथः द्रोणः", "हितोपदेशः", "सुभाषितसप्तकम्", "पर्यावरणम्", "कूटस्थः", "व्याकरण: सन्धि", "व्याकरण: समास", "व्याकरण: कृदन्त", "लघुसिद्धान्तकौमुदी आधारित रूप"] },
    ],
  },

  "12": {
    Mathematics: [
      { chapter: "Chapter 1: Relations and Functions", subtopics: ["Types of relations", "Types of functions", "Invertible functions", "Binary operations"] },
      { chapter: "Chapter 2: Inverse Trigonometric Functions", subtopics: ["Domain and range", "Principal value branches", "Properties"] },
      { chapter: "Chapter 3: Matrices", subtopics: ["Operations on matrices", "Types of matrices", "Transpose", "Symmetric and skew-symmetric matrices", "Inverse"] },
      { chapter: "Chapter 4: Determinants", subtopics: ["Properties of determinants", "Area of triangles", "Minors and cofactors", "Inverse of a matrix via adjoint", "Solving linear equations"] },
      { chapter: "Chapter 5: Continuity and Differentiability", subtopics: ["Continuity", "Differentiability", "Chain rule", "Implicit differentiation", "Parametric differentiation", "Second-order derivative", "Mean Value Theorem"] },
      { chapter: "Chapter 6: Application of Derivatives", subtopics: ["Rate of change", "Increasing and decreasing functions", "Tangents and normals", "Maxima and minima"] },
      { chapter: "Chapter 7: Integrals", subtopics: ["Integration by substitution", "Partial fractions", "Integration by parts", "Definite integrals", "Properties of definite integrals"] },
      { chapter: "Chapter 8: Application of Integrals", subtopics: ["Area under simple curves", "Area between two curves"] },
      { chapter: "Chapter 9: Differential Equations", subtopics: ["Order and degree", "General and particular solutions", "Variable separable", "Homogeneous equations", "Linear differential equations"] },
      { chapter: "Chapter 10: Vector Algebra", subtopics: ["Vector types", "Addition of vectors", "Scalar product", "Vector product"] },
      { chapter: "Chapter 11: Three Dimensional Geometry", subtopics: ["Direction cosines and ratios", "Lines in space", "Shortest distance between lines", "Planes"] },
      { chapter: "Chapter 12: Linear Programming", subtopics: ["Mathematical formulation of LPP", "Graphical method of solving feasible regions"] },
      { chapter: "Chapter 13: Probability", subtopics: ["Conditional probability", "Multiplication theorem", "Independent events", "Bayes' theorem", "Random variables", "Binomial distribution"] },
    ],
    Physics: [
      { chapter: "Chapter 1: Electric Charges and Fields", subtopics: ["Coulomb's law", "Electric field", "Electric flux", "Gauss's law and applications"] },
      { chapter: "Chapter 2: Electrostatic Potential and Capacitance", subtopics: ["Electrostatic potential", "Equipotential surfaces", "Capacitance", "Dielectric polarization"] },
      { chapter: "Chapter 3: Current Electricity", subtopics: ["Ohm's law", "Drift velocity", "Kirchhoff's laws", "Wheatstone bridge", "Potentiometer"] },
      { chapter: "Chapter 4: Moving Charges and Magnetism", subtopics: ["Biot-Savart law", "Ampere's circuital law", "Force on moving charges and current conductors", "Moving coil galvanometer"] },
      { chapter: "Chapter 5: Magnetism and Matter", subtopics: ["Bar magnets", "Earth's magnetism", "Diamagnetic, paramagnetic and ferromagnetic materials"] },
      { chapter: "Chapter 6: Electromagnetic Induction", subtopics: ["Faraday's laws", "Lenz's law", "Motional EMF", "Self and mutual induction", "AC generator"] },
      { chapter: "Chapter 7: Alternating Current", subtopics: ["AC circuits", "LCR series circuit", "Resonance", "Power in AC circuits", "Transformers"] },
      { chapter: "Chapter 8: Electromagnetic Waves", subtopics: ["Displacement current", "Electromagnetic spectrum"] },
      { chapter: "Chapter 9: Ray Optics and Optical Instruments", subtopics: ["Reflection", "Refraction", "Total internal reflection", "Lenses", "Prism", "Optical instruments (microscopes, telescopes)"] },
      { chapter: "Chapter 10: Wave Optics", subtopics: ["Huygens' principle", "Interference (Young's double slit experiment)", "Diffraction", "Polarization"] },
      { chapter: "Chapter 11: Dual Nature of Radiation and Matter", subtopics: ["Photoelectric effect", "Einstein's equation", "de Broglie wavelength"] },
      { chapter: "Chapter 12: Atoms", subtopics: ["Rutherford model", "Bohr model", "Atomic spectra"] },
      { chapter: "Chapter 13: Nuclei", subtopics: ["Nuclear composition", "Mass defect", "Binding energy", "Radioactivity", "Nuclear fission and fusion"] },
      { chapter: "Chapter 14: Semiconductor Electronics", subtopics: ["Energy bands", "Intrinsic and extrinsic semiconductors", "p-n junction diodes", "Rectifiers", "Logic gates"] },
    ],
    Chemistry: [
      { chapter: "Chapter 1: Solutions", subtopics: ["Concentration terms", "Vapour pressure", "Raoult's law", "Colligative properties", "Abnormal molar mass"] },
      { chapter: "Chapter 2: Electrochemistry", subtopics: ["Galvanic cells", "Nernst equation", "Electrolytic conductance", "Batteries", "Fuel cells", "Corrosion"] },
      { chapter: "Chapter 3: Chemical Kinetics", subtopics: ["Rate of reaction", "Integrated rate laws", "Half-life", "Arrhenius equation", "Collision theory"] },
      { chapter: "Chapter 4: The d- and f-Block Elements", subtopics: ["Transition elements properties", "Inner transition elements (lanthanoids and actinoids)"] },
      { chapter: "Chapter 5: Coordination Compounds", subtopics: ["Werner's theory", "IUPAC nomenclature", "Isomerism", "Valence Bond Theory", "Crystal Field Theory"] },
      { chapter: "Chapter 6: Haloalkanes and Haloarenes", subtopics: ["Nomenclature", "Nature of C-X bond", "Preparation", "Nucleophilic substitution reactions (SN1, SN2)"] },
      { chapter: "Chapter 7: Alcohols, Phenols and Ethers", subtopics: ["Preparation", "Physical properties", "Chemical reactions", "Acidic nature of phenols"] },
      { chapter: "Chapter 8: Aldehydes, Ketones and Carboxylic Acids", subtopics: ["Carbonyl group chemistry", "Name reactions (Aldol, Cannizzaro)", "Carboxylic acid acidity"] },
      { chapter: "Chapter 9: Amines", subtopics: ["Classification", "Preparation", "Basic character", "Diazonium salts"] },
      { chapter: "Chapter 10: Biomolecules", subtopics: ["Carbohydrates", "Proteins", "Enzymes", "Vitamins", "Nucleic acids (DNA/RNA)"] },
    ],
    "Computer Science": [
      { chapter: "Chapter 1: Python Revision Tour", subtopics: ["Review of Python basics", "Functions", "Modules", "Data structures"] },
      { chapter: "Chapter 2: Functions", subtopics: ["Arguments", "Local and global scope", "Mutable and immutable argument passing"] },
      { chapter: "Chapter 3: File Handling", subtopics: ["Text files", "Binary files", "CSV files", "Reading and writing modes"] },
      { chapter: "Chapter 4: Data Structures (Stack & Queue)", subtopics: ["Implementation of stack using lists", "Implementation of queue using lists"] },
      { chapter: "Chapter 5: Computer Networks", subtopics: ["Network types (LAN, WAN)", "Topologies", "Networking devices", "Protocols", "Web structure"] },
      { chapter: "Chapter 6: Database Management System (SQL)", subtopics: ["DDL commands", "DML commands", "Constraints", "Aggregate functions", "Joins"] },
    ],
    English: ENGLISH_CHAPTERS["12"],
    Hindi: [
      { chapter: "आरोह भाग 2", subtopics: ["हरिवंश राय बच्चन (आत्मपरिचय, एक गीत)", "जैनेंद्र कुमार (बाज़ार दर्शन)", "कुँवर नारायण (कविता के बहाने, बात सीधी थी पर)", "सुमित्रानंदन पंत (बादल राग)", "शमशेर बहादुर सिंह (उषा)", "सूर्यकांत त्रिपाठी 'निराला' (कवितावली, लक्ष्मण-मूर्च्छा)", "फ़िराक़ गोरखपुरी (रुबाइयाँ, गज़ल)", "महादेवी वर्मा (भक्तिन)", "विष्णु खरे (चार्ली चैप्लिन और हम सब)", "रज़िया सज्जाद ज़हीर (नमक)", "हजारीप्रसाद द्विवेदी (शिरीष के फूल)", "भीमराव आंबेडकर (श्रम विभाजन और जातिप्रथा, मेरी कल्पना का आदर्श समाज)"] },
      { chapter: "वितान भाग 2", subtopics: ["सिल्वर वेडिंग (मनोहर श्याम जोशी)", "जूझ (आनंद यादव)", "अतीत में दबे पाँव (ओम थानवी)", "डायरी के पन्ने (ऐनी फ्रैंक)"] },
    ],
    Sanskrit: [
      { chapter: "भास्वती भाग 2 (पाठ 1–12)", subtopics: ["अनुशासनम्", "बुद्धिर्बलवती सदा", "सूक्तिसौरभम्", "राष्ट्रहितैषिणः", "क्षमया शोभते पृथिवी", "विज्ञाननौका", "सुभाषितानि", "अनयो धर्मस्य तत्त्वम्", "व्याकरण: सन्धि", "व्याकरण: समास", "व्याकरण: कारक", "व्याकरण: प्रत्यय", "अनुवाद एवं अवबोधनम्"] },
    ],
  },
};

export const SYLLABUS_CLASSES = ["9", "10", "11", "12"];

export function subjectsForClass(klass: string): string[] {
  return Object.keys(NCERT_SYLLABUS[klass] || {});
}

export function chaptersFor(klass: string, subject: string): SyllabusChapter[] {
  return NCERT_SYLLABUS[klass]?.[subject] || [];
}

export function subtopicsFor(klass: string, subject: string, chapter: string): string[] {
  if (subject === "English") return [];
  const canonical = chaptersFor(klass, subject).find((c) => c.chapter === chapter)?.subtopics || [];
  const extra = EXTRA_SUBTOPICS[`${klass}|${subject}|${chapter}`] || [];
  return Array.from(new Set([...canonical, ...extra]));
}
