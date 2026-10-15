import type { Slide } from "@/lib/generate.functions";
/** Curated mathematical reference, separate from retrieved textbook notes.
 * Standard identities written independently; conditions travel with each formula.
 * Scope/reference: https://www.ncert.nic.in/desm/pdf/desm_s_physics.pdf
 * Source book catalog: https://ncert.nic.in/textbook.php
 */
export const PHYSICS_FORMULA_REFERENCE: Record<string, Array<{chapter: string; rows: string[][]}>> = {
  "11": [
    {
      "chapter": "Units and Measurement",
      "rows": [
        [
          "Mean and absolute error",
          "\\bar x=\\frac{1}{N}\\sum x_i,\\quad \\Delta x=\\frac{1}{N}\\sum|x_i-\\bar x|",
          "N readings x_i; mean absolute error is not standard deviation."
        ],
        [
          "Relative / percentage error",
          "\\epsilon=\\frac{\\Delta x}{|x|},\\quad \\epsilon_{\\%}=100\\epsilon",
          "x is the nonzero measured value; Δx is its absolute uncertainty."
        ],
        [
          "Sum and difference uncertainty",
          "\\Delta z=\\Delta x+\\Delta y",
          "Maximum absolute uncertainty for z=x±y."
        ],
        [
          "Product, quotient and power uncertainty",
          "\\frac{\\Delta z}{|z|}\\approx |a|\\frac{\\Delta x}{|x|}+|b|\\frac{\\Delta y}{|y|}",
          "For z=x^a y^b; small maximum fractional uncertainties, nonzero values."
        ],
        [
          "Dimensional homogeneity",
          "[A]=[B]\\quad\\text{if }A=B",
          "Necessary consistency check; does not fix dimensionless numerical factors."
        ]
      ]
    },
    {
      "chapter": "Motion in a Straight Line",
      "rows": [
        [
          "Average velocity",
          "v_{\\rm av}=\\frac{x_2-x_1}{t_2-t_1}",
          "Displacement divided by elapsed time; average speed uses total distance instead."
        ],
        [
          "Instantaneous motion",
          "v=\\frac{dx}{dt},\\quad a=\\frac{dv}{dt}",
          "x position, t time, v velocity, a acceleration; signed along the chosen axis."
        ],
        [
          "Velocity after time t",
          "v=u+at",
          "Constant acceleration; u initial velocity, v final velocity."
        ],
        [
          "Displacement",
          "s=ut+\\frac12at^2=\\frac{u+v}{2}t",
          "Constant acceleration; s displacement."
        ],
        [
          "Time-independent relation",
          "v^2=u^2+2as",
          "Constant acceleration; choose signs consistently."
        ],
        [
          "Relative velocity",
          "v_{A/B}=v_A-v_B",
          "Velocities measured in the same reference frame."
        ]
      ]
    },
    {
      "chapter": "Motion in a Plane",
      "rows": [
        [
          "Vector magnitude",
          "|\\vec A|=\\sqrt{A_x^2+A_y^2}",
          "Cartesian perpendicular components."
        ],
        [
          "Vector products",
          "\\vec A\\cdot\\vec B=AB\\cos\\theta,\\quad |\\vec A\\times\\vec B|=AB\\sin\\theta",
          "θ angle between vectors; cross-product direction by right-hand rule."
        ],
        [
          "Projectile coordinates",
          "x=u\\cos\\theta\\,t,\\quad y=u\\sin\\theta\\,t-\\frac12gt^2",
          "No air resistance, uniform g, launch point as origin; upward y positive."
        ],
        [
          "Projectile flight and range",
          "T=\\frac{2u\\sin\\theta}{g},\\quad R=\\frac{u^2\\sin2\\theta}{g}",
          "Landing at launch height; T flight time, R horizontal range."
        ],
        [
          "Maximum height",
          "H=\\frac{u^2\\sin^2\\theta}{2g}",
          "Height above launch level under uniform gravity."
        ],
        [
          "Uniform circular motion",
          "v=\\omega r,\\quad a_c=\\frac{v^2}{r}=\\omega^2r",
          "r radius; ω angular speed; acceleration points towards centre."
        ]
      ]
    },
    {
      "chapter": "Laws of Motion",
      "rows": [
        [
          "Newton’s second law",
          "\\vec F_{\\rm net}=\\frac{d\\vec p}{dt}=m\\vec a",
          "Final equality for constant mass in an inertial frame."
        ],
        [
          "Momentum and impulse",
          "\\vec p=m\\vec v,\\quad \\vec J=\\int\\vec F\\,dt=\\Delta\\vec p",
          "J impulse; net external force changes system momentum."
        ],
        [
          "Weight",
          "W=mg",
          "W gravitational-force magnitude near Earth; apparent weight can differ."
        ],
        [
          "Static and kinetic friction",
          "0\\le f_s\\le\\mu_sN,\\quad f_k=\\mu_kN",
          "N normal reaction; static friction is not always at its limiting value."
        ],
        [
          "Inclined plane gravity components",
          "F_{\\parallel}=mg\\sin\\theta,\\quad F_{\\perp}=mg\\cos\\theta",
          "θ incline angle to horizontal; N=mg cosθ only if no other normal forces."
        ],
        [
          "Centripetal net force",
          "F_c=\\frac{mv^2}{r}",
          "Radial component of net force; not an extra force."
        ],
        [
          "Ideal banked road",
          "\\tan\\theta=\\frac{v^2}{rg}",
          "No friction; θ banking angle."
        ]
      ]
    },
    {
      "chapter": "Work, Energy and Power",
      "rows": [
        [
          "Work",
          "W=\\int\\vec F\\cdot d\\vec r=Fs\\cos\\theta",
          "Last expression for constant force over straight displacement s."
        ],
        [
          "Kinetic energy and work theorem",
          "K=\\frac12mv^2,\\quad W_{\\rm net}=\\Delta K",
          "Nonrelativistic motion."
        ],
        [
          "Power",
          "P=\\frac{dW}{dt}=\\vec F\\cdot\\vec v",
          "Instantaneous mechanical power."
        ],
        [
          "Potential energies",
          "U_g=mgh,\\quad U_s=\\frac12kx^2",
          "Uniform g with chosen zero level; ideal Hooke spring extension x."
        ],
        [
          "Mechanical energy",
          "K_i+U_i=K_f+U_f",
          "Only conservative forces do work; otherwise include nonconservative work."
        ],
        [
          "Restitution in one dimension",
          "e=\\frac{v_2-v_1}{u_1-u_2}",
          "Objects approach before impact; use signed velocities along same line."
        ],
        [
          "Perfectly inelastic collision",
          "v=\\frac{m_1u_1+m_2u_2}{m_1+m_2}",
          "Bodies stick; negligible net external impulse."
        ]
      ]
    },
    {
      "chapter": "System of Particles and Rotational Motion",
      "rows": [
        [
          "Centre of mass",
          "\\vec R=\\frac{\\sum m_i\\vec r_i}{\\sum m_i}",
          "m_i masses at positions r_i."
        ],
        [
          "Rotational kinematics",
          "\\omega=\\omega_0+\\alpha t,\\quad \\theta=\\omega_0t+\\frac12\\alpha t^2",
          "Constant angular acceleration α about fixed axis."
        ],
        [
          "Torque and angular momentum",
          "\\vec\\tau=\\vec r\\times\\vec F,\\quad \\vec L=\\vec r\\times\\vec p,\\quad \\vec\\tau_{\\rm ext}=\\frac{d\\vec L}{dt}",
          "Use a fixed inertial origin; L=Iω for rotation about a principal fixed axis."
        ],
        [
          "Moment of inertia",
          "I=\\sum m_ir_i^2,\\quad \\tau=I\\alpha",
          "r_i perpendicular distances to axis; second relation fixed axis and constant I."
        ],
        [
          "Axis theorems",
          "I=I_{\\rm CM}+Md^2,\\quad I_z=I_x+I_y",
          "First: parallel axes. Second: perpendicular axes of a planar lamina."
        ],
        [
          "Rotational energy and rolling",
          "K=\\frac12Mv_{\\rm CM}^2+\\frac12I_{\\rm CM}\\omega^2,\\quad v_{\\rm CM}=R\\omega",
          "Rolling relation requires no slipping."
        ],
        [
          "Standard moments",
          "I_{\\rm ring}=MR^2,\\ I_{\\rm disc}=\\frac12MR^2,\\ I_{\\rm rod}=\\frac1{12}ML^2",
          "Ring/disc symmetry axis; uniform thin rod through centre perpendicular to its length."
        ]
      ]
    },
    {
      "chapter": "Gravitation",
      "rows": [
        [
          "Gravitational force",
          "F=G\\frac{m_1m_2}{r^2}",
          "Point masses or spherical symmetric bodies; r centre separation."
        ],
        [
          "Field, potential and energy",
          "g=\\frac{GM}{r^2},\\quad V=-\\frac{GM}{r},\\quad U=-\\frac{GMm}{r}",
          "Outside spherical mass M; zero potential at infinity."
        ],
        [
          "Height and depth",
          "g_h=g_0\\left(\\frac{R}{R+h}\\right)^2,\\quad g_d=g_0\\left(1-\\frac dR\\right)",
          "Depth formula assumes uniform Earth density; R Earth radius."
        ],
        [
          "Circular orbital speed",
          "v_o=\\sqrt{\\frac{GM}{r}}",
          "Circular orbit at centre distance r."
        ],
        [
          "Period and orbital energy",
          "T=2\\pi\\sqrt{\\frac{r^3}{GM}},\\quad E=-\\frac{GMm}{2r}",
          "Circular orbit; satellite mass negligible compared with M."
        ],
        [
          "Escape speed",
          "v_e=\\sqrt{\\frac{2GM}{R}}",
          "From radius R to infinity with zero final speed; ignore atmosphere and rotation."
        ]
      ]
    },
    {
      "chapter": "Mechanical Properties of Solids",
      "rows": [
        [
          "Normal stress and strain",
          "\\sigma=\\frac FA,\\quad \\epsilon=\\frac{\\Delta L}{L}",
          "Uniform axial load; original length L, cross-section A."
        ],
        [
          "Young modulus",
          "Y=\\frac{\\sigma}{\\epsilon},\\quad \\Delta L=\\frac{FL}{AY}",
          "Within linear elastic range."
        ],
        [
          "Bulk modulus",
          "B=-\\frac{\\Delta P}{\\Delta V/V},\\quad \\kappa=\\frac1B",
          "Small isotropic volume change; κ compressibility."
        ],
        [
          "Shear modulus",
          "G_s=\\frac{F/A}{x/L}",
          "Small shear displacement x across separation L."
        ],
        [
          "Elastic energy",
          "U=\\frac{F\\Delta L}{2},\\quad u=\\frac12\\sigma\\epsilon",
          "Gradual loading in linear elastic regime; u energy per volume."
        ]
      ]
    },
    {
      "chapter": "Mechanical Properties of Fluids",
      "rows": [
        [
          "Hydrostatic pressure",
          "P=P_0+\\rho gh",
          "Fluid at rest, constant density ρ, depth h."
        ],
        [
          "Buoyant force",
          "F_b=\\rho_fV_{\\rm displaced}g",
          "ρ_f fluid density; use displaced fluid volume."
        ],
        [
          "Continuity and Bernoulli",
          "A_1v_1=A_2v_2,\\quad P+\\frac12\\rho v^2+\\rho gh=\\text{constant}",
          "Steady incompressible flow; Bernoulli additionally inviscid along a streamline."
        ],
        [
          "Viscous force",
          "F=\\eta A\\frac{dv}{dy}",
          "Newtonian fluid; magnitude of tangential viscous force."
        ],
        [
          "Stokes law and terminal speed",
          "F_d=6\\pi\\eta rv,\\quad v_t=\\frac{2r^2(\\rho_s-\\rho_f)g}{9\\eta}",
          "Small sphere, creeping flow; downward terminal speed if ρ_s>ρ_f."
        ],
        [
          "Surface tension and capillary rise",
          "S=\\frac Fl,\\quad h=\\frac{2S\\cos\\theta}{\\rho gr}",
          "Single interface force length l; capillary radius r, contact angle θ."
        ],
        [
          "Excess pressure",
          "\\Delta P_{\\rm drop}=\\frac{2S}{r},\\quad \\Delta P_{\\rm soap}=\\frac{4S}{r}",
          "Spherical liquid drop: one surface; soap bubble: two surfaces."
        ]
      ]
    },
    {
      "chapter": "Thermal Properties of Matter",
      "rows": [
        [
          "Linear and volume expansion",
          "\\Delta L=\\alpha L_0\\Delta T,\\quad \\Delta V=\\gamma V_0\\Delta T",
          "Small temperature change with approximately constant coefficients."
        ],
        [
          "Isotropic expansion",
          "\\beta\\approx2\\alpha,\\quad\\gamma\\approx3\\alpha",
          "β area coefficient, γ volume coefficient; small expansion."
        ],
        [
          "Sensible and latent heat",
          "Q=mc\\Delta T,\\quad Q=mL",
          "First: no phase change. Second: phase change at transition temperature."
        ],
        [
          "Conduction rate",
          "\\dot Q=\\frac{kA(T_h-T_c)}{L}",
          "Steady one-dimensional conduction through uniform slab."
        ],
        [
          "Radiative heat loss",
          "P_{\\rm net}=e\\sigma A(T^4-T_s^4)",
          "Kelvin temperatures; emissivity e, surroundings T_s."
        ],
        [
          "Newton cooling approximation",
          "\\frac{dT}{dt}=-b(T-T_s)",
          "Small excess temperature; fixed thermal properties and surroundings."
        ]
      ]
    },
    {
      "chapter": "Thermodynamics",
      "rows": [
        [
          "First law",
          "\\Delta U=Q-W",
          "Q heat added to gas; W work done by gas."
        ],
        [
          "Gas work",
          "W=\\int_{V_i}^{V_f}P\\,dV",
          "Quasistatic process; area under P–V curve."
        ],
        [
          "Ideal gas and internal energy",
          "PV=nRT,\\quad\\Delta U=nC_V\\Delta T",
          "Ideal gas; constant molar C_V for the stated temperature interval."
        ],
        [
          "Heat capacities",
          "C_P-C_V=R,\\quad\\gamma=\\frac{C_P}{C_V}",
          "Molar capacities of ideal gas."
        ],
        [
          "Isothermal ideal gas work",
          "W=nRT\\ln\\frac{V_f}{V_i}",
          "Reversible isothermal expansion or compression."
        ],
        [
          "Adiabatic ideal gas",
          "PV^\\gamma=\\text{constant},\\quad W=\\frac{P_iV_i-P_fV_f}{\\gamma-1}",
          "Reversible adiabatic ideal gas; constant capacities."
        ],
        [
          "Heat engine efficiency",
          "\\eta=\\frac W{Q_h}=1-\\frac{Q_c}{Q_h},\\quad\\eta_C=1-\\frac{T_c}{T_h}",
          "Heat magnitudes positive; Carnot upper limit uses Kelvin temperatures."
        ]
      ]
    },
    {
      "chapter": "Kinetic Theory",
      "rows": [
        [
          "Ideal gas",
          "PV=Nk_BT=nRT",
          "N molecules, n moles, k_B Boltzmann constant."
        ],
        [
          "Kinetic pressure",
          "P=\\frac13\\rho v_{\\rm rms}^2",
          "Dilute ideal gas with random isotropic molecular motion."
        ],
        [
          "Molecular energy and rms speed",
          "\\langle K\\rangle=\\frac32k_BT,\\quad v_{\\rm rms}=\\sqrt{\\frac{3k_BT}{m}}",
          "Translational energy per molecule; m molecular mass, T kelvin."
        ],
        [
          "Equipartition",
          "U=\\frac f2nRT,\\quad C_V=\\frac f2R,\\quad C_P=\\frac{f+2}{2}R",
          "f active quadratic degrees of freedom; ideal gas and fixed active modes."
        ],
        [
          "Adiabatic index",
          "\\gamma=\\frac{f+2}{f}",
          "Same ideal-gas equipartition assumptions."
        ],
        [
          "Mean free path",
          "\\lambda=\\frac{1}{\\sqrt2\\pi d^2(N/V)}",
          "Hard-sphere dilute gas; d effective molecular diameter."
        ]
      ]
    },
    {
      "chapter": "Oscillations",
      "rows": [
        [
          "SHM displacement",
          "x=A\\cos(\\omega t+\\phi)",
          "x measured from equilibrium; amplitude A and initial phase φ."
        ],
        [
          "Velocity and acceleration",
          "v=-A\\omega\\sin(\\omega t+\\phi),\\quad a=-\\omega^2x",
          "Ideal simple harmonic motion."
        ],
        [
          "Speed at displacement",
          "v^2=\\omega^2(A^2-x^2)",
          "Sign of v depends on direction of motion."
        ],
        [
          "Spring oscillator",
          "T=2\\pi\\sqrt{\\frac mk},\\quad\\omega=\\sqrt{\\frac km}",
          "Ideal massless spring; effective moving mass m."
        ],
        [
          "Simple pendulum",
          "T=2\\pi\\sqrt{\\frac lg}",
          "Small angular amplitude; light string and point bob, uniform gravity."
        ],
        [
          "Oscillator energy",
          "E=\\frac12kA^2,\\quad U=\\frac12kx^2,\\quad K=\\frac12k(A^2-x^2)",
          "Undamped spring oscillator; k=mω²."
        ]
      ]
    },
    {
      "chapter": "Waves",
      "rows": [
        [
          "Progressive wave",
          "y=A\\sin(kx-\\omega t+\\phi),\\quad v=\\frac\\omega k=f\\lambda",
          "Travels along +x; k=2π/λ, ω=2πf."
        ],
        [
          "Wave speeds",
          "v_{\\rm string}=\\sqrt{\\frac{T_s}{\\mu}},\\quad v_{\\rm sound}=\\sqrt{\\frac{\\gamma P}{\\rho}}",
          "String tension T_s, mass per length μ; adiabatic sound in ideal gas."
        ],
        [
          "String / open-pipe harmonics",
          "f_n=\\frac{nv}{2L}",
          "n=1,2,...; ideal fixed string or open pipe, negligible end correction."
        ],
        [
          "Closed-pipe harmonics",
          "f_n=\\frac{(2n-1)v}{4L}",
          "One closed and one open end; n=1,2,...; no end correction."
        ],
        [
          "Beats",
          "f_b=|f_1-f_2|",
          "Two nearby frequencies superpose."
        ],
        [
          "Sound Doppler shift",
          "f_o=f_s\\frac{v+v_o}{v-v_s}",
          "v_o positive toward source; v_s positive toward observer; speeds relative to still medium, subsonic."
        ]
      ]
    }
  ],
  "12": [
    {
      "chapter": "Electric Charges and Fields",
      "rows": [
        [
          "Coulomb force magnitude",
          "F=\\frac{|q_1q_2|}{4\\pi\\varepsilon_0r^2}",
          "Vacuum point charges separated by r; direction along their joining line."
        ],
        [
          "Point-charge electric field",
          "\\vec E=\\frac{q}{4\\pi\\varepsilon_0r^2}\\hat r,\\quad\\vec F=q_0\\vec E",
          "Vacuum; q_0 test charge. Superpose fields vectorially."
        ],
        [
          "Electric flux / Gauss law",
          "\\Phi_E=\\int\\vec E\\cdot d\\vec A,\\quad\\oint\\vec E\\cdot d\\vec A=\\frac{q_{\\rm enc}}{\\varepsilon_0}",
          "Closed Gaussian surface for second relation; use symmetry to extract E."
        ],
        [
          "Dipole moment and torque",
          "\\vec p=q\\vec d,\\quad\\vec\\tau=\\vec p\\times\\vec E",
          "d points from negative to positive charge; torque in uniform field."
        ],
        [
          "Dipole far fields",
          "E_{\\rm axial}=\\frac{2p}{4\\pi\\varepsilon_0r^3},\\quad E_{\\rm equatorial}=\\frac{p}{4\\pi\\varepsilon_0r^3}",
          "Magnitudes at r much larger than charge separation; equatorial field opposes p."
        ],
        [
          "Line / plane fields",
          "E_{\\rm line}=\\frac{|\\lambda|}{2\\pi\\varepsilon_0r},\\quad E_{\\rm sheet}=\\frac{|\\sigma|}{2\\varepsilon_0}",
          "Infinite straight line and infinite nonconducting plane sheet in vacuum."
        ]
      ]
    },
    {
      "chapter": "Electrostatic Potential and Capacitance",
      "rows": [
        [
          "Potential and energy",
          "V=\\frac{q}{4\\pi\\varepsilon_0r},\\quad U=\\frac{q_1q_2}{4\\pi\\varepsilon_0r}",
          "Point charges in vacuum; zero at infinity."
        ],
        [
          "Potential-field relation",
          "\\Delta V=-\\int\\vec E\\cdot d\\vec l,\\quad E_x=-\\frac{dV}{dx}",
          "Electrostatic field; second form for one-dimensional variation."
        ],
        [
          "Dipole potential / energy",
          "V=\\frac{p\\cos\\theta}{4\\pi\\varepsilon_0r^2},\\quad U=-\\vec p\\cdot\\vec E",
          "Potential far from dipole; energy in uniform external field."
        ],
        [
          "Capacitance",
          "C=\\frac QV,\\quad C_{\\rm plate}=\\frac{\\varepsilon_0KA}{d}",
          "Q plate charge magnitude; plate formula ignores edge effects, uniform filling dielectric K."
        ],
        [
          "Capacitor combinations",
          "C_{\\parallel}=\\sum C_i,\\quad\\frac1{C_{\\rm series}}=\\sum\\frac1{C_i}",
          "Ideal capacitors; identify circuit topology before combining."
        ],
        [
          "Capacitor energy",
          "U=\\frac12CV^2=\\frac{Q^2}{2C}=\\frac12QV",
          "Electrostatic energy; Q,V,C refer to the same capacitor."
        ]
      ]
    },
    {
      "chapter": "Current Electricity",
      "rows": [
        [
          "Uniform conductor field",
          "E=\\frac Vl",
          "Magnitude; uniform longitudinal field, conductor length l."
        ],
        [
          "Current and drift",
          "I=\\frac{dq}{dt}=neAv_d",
          "n carrier number density, e elementary charge magnitude, A cross-section; v_d drift-speed magnitude."
        ],
        [
          "Drift speed",
          "v_d=\\frac{eE\\tau}{m}",
          "Drude model; τ mean relaxation time, m electron mass."
        ],
        [
          "Microscopic current",
          "I=\\frac{ne^2A\\tau}{ml}V",
          "Uniform conductor in the Drude model."
        ],
        [
          "Ohm law and resistance",
          "V=IR,\\quad R=\\frac{ml}{ne^2A\\tau}",
          "Ohmic conductor; fixed temperature/material state; microscopic R uses Drude assumptions."
        ],
        [
          "Resistivity / conductivity",
          "\\rho=\\frac{RA}{l}=\\frac{m}{ne^2\\tau},\\quad\\sigma=\\frac1\\rho",
          "Uniform material; microscopic form uses Drude model."
        ],
        [
          "Resistor combinations",
          "R_s=\\sum R_i,\\quad\\frac1{R_p}=\\sum\\frac1{R_i}",
          "Series: common current; parallel: common potential difference."
        ],
        [
          "Power and heating",
          "P=VI=I^2R=\\frac{V^2}{R},\\quad Q=I^2Rt",
          "Resistive element; Q expression for constant I and R over t."
        ],
        [
          "Cell terminal voltage",
          "V=\\mathcal E-Ir,\\quad I=\\frac{\\mathcal E}{R+r}",
          "Discharging cell; emf ℰ, internal resistance r, external load R."
        ],
        [
          "Temperature and bridge balance",
          "R=R_0[1+\\alpha(T-T_0)],\\quad\\frac P Q=\\frac R S",
          "Linear temperature approximation; P,Q,R,S are bridge-arm resistances at null balance."
        ]
      ]
    },
    {
      "chapter": "Moving Charges and Magnetism",
      "rows": [
        [
          "Lorentz force",
          "\\vec F=q(\\vec E+\\vec v\\times\\vec B)",
          "Magnetic part does no work on an isolated moving charge."
        ],
        [
          "Magnetic orbit",
          "r=\\frac{mv_\\perp}{|q|B},\\quad T=\\frac{2\\pi m}{|q|B}",
          "Uniform B, nonrelativistic motion; use transverse speed."
        ],
        [
          "Current-element law",
          "d\\vec B=\\frac{\\mu_0}{4\\pi}\\frac{I\\,d\\vec l\\times\\hat r}{r^2}",
          "Biot–Savart law for steady current in vacuum."
        ],
        [
          "Wire / circular-loop fields",
          "B_{\\rm wire}=\\frac{\\mu_0I}{2\\pi r},\\quad B_{\\rm centre}=\\frac{\\mu_0NI}{2R}",
          "Infinite straight wire; N circular turns of radius R at their centre."
        ],
        [
          "Solenoid / Ampere law",
          "B=\\mu_0nI,\\quad\\oint\\vec B\\cdot d\\vec l=\\mu_0I_{\\rm enc}",
          "Long air-core solenoid; n turns per length. Circuital law here magnetostatic."
        ],
        [
          "Force and torque",
          "\\vec F=I\\vec l\\times\\vec B,\\quad\\vec\\tau=\\vec m\\times\\vec B,\\quad m=NIA",
          "Straight conductor in uniform B; planar coil area A."
        ],
        [
          "Galvanometer conversions",
          "S=\\frac{I_gG}{I-I_g},\\quad R_s=\\frac V{I_g}-G",
          "G galvanometer resistance, I_g full-scale current; shunt S for ammeter, series R_s for voltmeter."
        ]
      ]
    },
    {
      "chapter": "Magnetism and Matter",
      "rows": [
        [
          "Dipole torque / energy",
          "\\tau=mB\\sin\\theta,\\quad U=-mB\\cos\\theta",
          "Magnetic dipole moment magnitude m in uniform field."
        ],
        [
          "Dipole far fields",
          "B_a=\\frac{\\mu_0}{4\\pi}\\frac{2m}{r^3},\\quad B_e=\\frac{\\mu_0}{4\\pi}\\frac m{r^3}",
          "Magnitudes far from a small dipole; equatorial field opposes dipole moment."
        ],
        [
          "Magnetisation",
          "M=\\frac{m_{\\rm net}}{V},\\quad B=\\mu_0(H+M)",
          "Uniform collinear form; m_net net dipole moment, V volume."
        ],
        [
          "Linear magnetic material",
          "M=\\chi_mH,\\quad\\mu_r=1+\\chi_m,\\quad B=\\mu_0\\mu_rH",
          "Linear isotropic response; hysteretic ferromagnets need not obey constant χ_m."
        ],
        [
          "Magnetic flux closure",
          "\\oint\\vec B\\cdot d\\vec A=0",
          "Net magnetic flux through any closed surface is zero."
        ],
        [
          "Earth-field components",
          "B_H=B\\cos\\delta,\\quad B_V=B\\sin\\delta,\\quad\\tan\\delta=\\frac{B_V}{B_H}",
          "δ magnetic dip angle measured from horizontal; B total local field."
        ]
      ]
    },
    {
      "chapter": "Electromagnetic Induction",
      "rows": [
        [
          "Flux and Faraday law",
          "\\Phi_B=\\int\\vec B\\cdot d\\vec A,\\quad\\mathcal E=-N\\frac{d\\Phi_B}{dt}",
          "N turns with equal flux per turn; minus sign expresses Lenz law."
        ],
        [
          "Motional emf",
          "\\mathcal E=Blv",
          "Magnitude for rod length l, velocity and B mutually perpendicular."
        ],
        [
          "Self and mutual induction",
          "\\mathcal E_L=-L\\frac{dI}{dt},\\quad\\mathcal E_2=-M\\frac{dI_1}{dt}",
          "Fixed geometry; mutual-emf sign also depends on chosen winding orientation."
        ],
        [
          "Long-solenoid inductance",
          "L=\\frac{\\mu_0N^2A}{l}",
          "Air core, negligible edge effects."
        ],
        [
          "Inductor energy",
          "U=\\frac12LI^2",
          "Linear ideal inductor, constant L."
        ],
        [
          "AC generator",
          "\\mathcal E=NBA\\omega\\sin\\omega t",
          "N-turn coil rotating uniformly in uniform field; chosen zero phase."
        ]
      ]
    },
    {
      "chapter": "Alternating Current",
      "rows": [
        [
          "Sinusoidal rms values",
          "V_{\\rm rms}=\\frac{V_0}{\\sqrt2},\\quad I_{\\rm rms}=\\frac{I_0}{\\sqrt2}",
          "Sinusoidal alternating quantities; subscript 0 denotes peak."
        ],
        [
          "Reactances",
          "X_L=\\omega L,\\quad X_C=\\frac1{\\omega C}",
          "Ideal inductor and capacitor at angular frequency ω."
        ],
        [
          "Series RLC impedance",
          "Z=\\sqrt{R^2+(X_L-X_C)^2},\\quad I_{\\rm rms}=\\frac{V_{\\rm rms}}Z",
          "Steady sinusoidal series circuit."
        ],
        [
          "Phase and mean power",
          "\\tan\\phi=\\frac{X_L-X_C}{R},\\quad P=V_{\\rm rms}I_{\\rm rms}\\cos\\phi",
          "φ voltage phase relative to current; cosφ power factor."
        ],
        [
          "Resonance",
          "\\omega_0=\\frac1{\\sqrt{LC}},\\quad f_0=\\frac1{2\\pi\\sqrt{LC}}",
          "Ideal series RLC resonance: X_L=X_C."
        ],
        [
          "Ideal transformer",
          "\\frac{V_s}{V_p}=\\frac{N_s}{N_p}=\\frac{I_p}{I_s}",
          "Ideal lossless transformer; rms values, common alternating flux."
        ]
      ]
    },
    {
      "chapter": "Electromagnetic Waves",
      "rows": [
        [
          "Displacement current",
          "I_d=\\varepsilon_0\\frac{d\\Phi_E}{dt}",
          "Vacuum electric flux Φ_E."
        ],
        [
          "Ampere–Maxwell law",
          "\\oint\\vec B\\cdot d\\vec l=\\mu_0(I_c+I_d)",
          "Consistent surface orientation; I_c conduction current."
        ],
        [
          "Wave speed",
          "c=\\frac1{\\sqrt{\\mu_0\\varepsilon_0}}=f\\lambda",
          "Vacuum electromagnetic wave; f frequency, λ vacuum wavelength."
        ],
        [
          "Field amplitudes",
          "\\frac{E_0}{B_0}=c",
          "Plane electromagnetic wave in vacuum."
        ],
        [
          "Energy densities",
          "u_E=\\frac12\\varepsilon_0E^2,\\quad u_B=\\frac{B^2}{2\\mu_0}",
          "Instantaneous vacuum energy densities; equal in a plane travelling wave."
        ]
      ]
    },
    {
      "chapter": "Ray Optics and Optical Instruments",
      "rows": [
        [
          "Mirror equation",
          "\\frac1f=\\frac1v+\\frac1u,\\quad m=-\\frac vu",
          "Paraxial spherical mirror; Cartesian signs, pole as origin."
        ],
        [
          "Refraction",
          "n_1\\sin i=n_2\\sin r,\\quad\\sin C=\\frac{n_2}{n_1}",
          "Critical-angle expression only for n_1>n_2; angles to normal."
        ],
        [
          "Spherical refraction",
          "\\frac{n_2}{v}-\\frac{n_1}{u}=\\frac{n_2-n_1}{R}",
          "Paraxial rays, consistent Cartesian signs."
        ],
        [
          "Thin lens",
          "\\frac1f=\\frac1v-\\frac1u,\\quad m=\\frac vu",
          "Thin lens in same surrounding medium on both sides; Cartesian signs."
        ],
        [
          "Lens maker / power",
          "\\frac1f=(n_{\\rm rel}-1)\\left(\\frac1{R_1}-\\frac1{R_2}\\right),\\quad P=\\frac1f",
          "Thin lens; f in metres gives power in dioptres."
        ],
        [
          "Contact lenses",
          "P=P_1+P_2,\\quad\\frac1F=\\frac1{f_1}+\\frac1{f_2}",
          "Thin lenses in contact, same medium."
        ],
        [
          "Prism at minimum deviation",
          "n_{\\rm rel}=\\frac{\\sin[(A+\\delta_m)/2]}{\\sin(A/2)}",
          "A prism angle; symmetric minimum-deviation path."
        ],
        [
          "Optical instruments",
          "M_{\\rm simple}=1+\\frac Df,\\quad |M_{\\rm telescope}|=\\frac{f_o}{f_e}",
          "Simple microscope final image at near point D; astronomical telescope normal adjustment."
        ]
      ]
    },
    {
      "chapter": "Wave Optics",
      "rows": [
        [
          "Path and phase",
          "\\phi=\\frac{2\\pi\\Delta}{\\lambda}",
          "Δ optical path difference, same monochromatic wavelength."
        ],
        [
          "Interference intensity",
          "I=I_1+I_2+2\\sqrt{I_1I_2}\\cos\\phi",
          "Coherent waves with compatible polarization."
        ],
        [
          "Young fringes",
          "\\beta=\\frac{\\lambda D}{d},\\quad y_m=\\frac{m\\lambda D}{d}",
          "Small angles, D much larger than slit separation d; bright fringe order m."
        ],
        [
          "Young dark fringes",
          "y_m=\\frac{(m+1/2)\\lambda D}{d}",
          "m=0,1,... on either side by sign."
        ],
        [
          "Single-slit diffraction",
          "a\\sin\\theta=m\\lambda,\\quad w_{\\rm central}\\approx\\frac{2\\lambda D}{a}",
          "Minima m=±1,±2,...; central width at small angles."
        ],
        [
          "Polarization",
          "I=I_0\\cos^2\\theta,\\quad\\tan i_B=\\frac{n_2}{n_1}",
          "Malus law for incident plane-polarised beam; Brewster angle at dielectric interface."
        ]
      ]
    },
    {
      "chapter": "Dual Nature of Radiation and Matter",
      "rows": [
        [
          "Photon energy / momentum",
          "E=hf=\\frac{hc}{\\lambda},\\quad p=\\frac h\\lambda",
          "Vacuum photon wavelength."
        ],
        [
          "Photoelectric equation",
          "K_{\\max}=hf-\\phi=eV_s",
          "φ work function; V_s stopping-potential magnitude, above threshold."
        ],
        [
          "Threshold",
          "f_0=\\frac\\phi h,\\quad\\lambda_0=\\frac{hc}{\\phi}",
          "No single-photon emission below threshold frequency."
        ],
        [
          "de Broglie wavelength",
          "\\lambda=\\frac hp",
          "Use appropriate momentum; nonrelativistic p=mv."
        ],
        [
          "Accelerated electron",
          "\\lambda=\\frac h{\\sqrt{2meV}}",
          "Electron accelerated from rest through V; nonrelativistic."
        ]
      ]
    },
    {
      "chapter": "Atoms",
      "rows": [
        [
          "Bohr angular momentum",
          "mvr=n\\hbar,\\quad\\hbar=\\frac h{2\\pi}",
          "Hydrogen-like one-electron ion, Bohr model."
        ],
        [
          "Bohr radius",
          "r_n=\\frac{a_0n^2}{Z}",
          "a_0≈5.29×10⁻¹¹ m; neglect reduced-mass correction."
        ],
        [
          "Energy levels",
          "E_n=-13.6\\frac{Z^2}{n^2}\\ \\mathrm{eV}",
          "Hydrogen-like ion; approximate fixed-nucleus model."
        ],
        [
          "Transition radiation",
          "hf=E_i-E_f",
          "Emission requires E_i>E_f; absorption uses positive reversed energy difference."
        ],
        [
          "Rydberg spectrum",
          "\\frac1\\lambda=R_\\infty Z^2\\left(\\frac1{n_f^2}-\\frac1{n_i^2}\\right)",
          "Emission n_i>n_f; R∞ approximation for heavy nucleus."
        ]
      ]
    },
    {
      "chapter": "Nuclei",
      "rows": [
        [
          "Nuclear composition",
          "A=Z+N",
          "A mass number, Z protons, N neutrons."
        ],
        [
          "Nuclear radius",
          "R=R_0A^{1/3}",
          "Empirical R_0 approximately 1.2 fm; approximate size relation."
        ],
        [
          "Mass defect and binding",
          "\\Delta m=Zm_p+Nm_n-M_{\\rm nucleus},\\quad B=\\Delta mc^2",
          "Use nuclear masses consistently; atomic-mass calculations must include electron cancellation."
        ],
        [
          "Binding per nucleon",
          "b=\\frac BA",
          "Compare average binding, not total binding alone."
        ],
        [
          "Radioactive decay",
          "N=N_0e^{-\\lambda t},\\quad\\mathcal A=\\lambda N",
          "Single isolated radioactive species; calligraphic A denotes activity, not mass number."
        ],
        [
          "Half-life / mean life",
          "T_{1/2}=\\frac{\\ln2}{\\lambda},\\quad\\tau=\\frac1\\lambda",
          "Constant decay constant λ."
        ],
        [
          "Reaction energy",
          "Q=(m_{\\rm initial}-m_{\\rm final})c^2",
          "Consistent complete masses; positive Q releases energy."
        ]
      ]
    },
    {
      "chapter": "Semiconductor Electronics",
      "rows": [
        [
          "Conductivity",
          "\\sigma=e(n\\mu_e+p\\mu_h),\\quad\\rho=\\frac1\\sigma",
          "n electron density, p hole density; μ mobilities in low-field transport."
        ],
        [
          "Intrinsic concentration",
          "n=p=n_i",
          "Intrinsic semiconductor at thermal equilibrium."
        ],
        [
          "Mass-action relation",
          "np=n_i^2",
          "Thermal equilibrium, nondegenerate semiconductor; fixed temperature."
        ],
        [
          "Circuit load relation",
          "I=\\frac{V_s-V_D}{R}",
          "Series diode and resistor; V_D must come from the stated model or I–V curve, not a universal fixed voltage."
        ],
        [
          "Ideal rectifier output",
          "V_{\\rm dc,half}=\\frac{V_m}{\\pi},\\quad V_{\\rm dc,full}=\\frac{2V_m}{\\pi}",
          "Supplementary ideal sinusoidal rectifier averages: resistive load, zero diode drop, no smoothing capacitor."
        ]
      ]
    }
  ]
};

export const FORMULA_REFERENCE_HEADING = "Problem-solving formula reference";
const key = (value: string) => value.toLowerCase().replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, '').replace(/[^a-z0-9]/g,'');
export function withPhysicsFormulaReference(slides: Slide[], klass: string, subject: string, chapter: string): Slide[] {
  if (!/^physics$/i.test(subject) || slides.some(slide => slide.visual === 'formula-reference')) return slides;
  const grade = klass.replace(/[^0-9]/g,'');
  const entry = PHYSICS_FORMULA_REFERENCE[grade]?.find(item => key(item.chapter) === key(chapter));
  if (!entry) return slides;
  const reference: Slide = {title: `${entry.chapter} — Formula reference`, kind: 'content', visual: 'formula-reference', bullets: [], notes: [], key_terms: [],
    caption: 'Additional formula reference · Apply the stated assumptions and sign conventions.',
    sections: [{heading: FORMULA_REFERENCE_HEADING, kind: 'formula', lines: entry.rows.map(([name, formula, conditions]) => `${name} | $${formula}$ | ${conditions}`)}]};
  const firstMcq = slides.findIndex(slide => slide.kind === 'mcq');
  const at = firstMcq < 0 ? slides.length : firstMcq;
  return [...slides.slice(0, at), reference, ...slides.slice(at)];
}
