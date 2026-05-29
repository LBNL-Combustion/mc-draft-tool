export const presetData = [
  {
    name: 'Preset Design 1: 15ft Chimney (6" Typical)',
    description: "6-inch diameter chimney: single-wall black pipe indoors, 90° elbow, horizontal triple-wall through wall, vertical triple-wall outdoors.",
    config: {
      parts: [
        {
          _name: "Black pipe (indoor vertical)",
          type: "single",
          inner_diameter_ft: 0.5,
          height_ft: 6.125,
          z_ft: 0,
          orientation: "vertical",
          T_ambient_K: 295.15,
          Pa: 98457,
          num_segments: 6,
          thickness_w_m: 0.00076,
          density_w_kg_m3: 7850,
          cp_w_J_kg_K: 460,
          k_w_W_m_K: 50,
          epsilon_w: 0.8,
          roughness_m: 0.00015
        },
        {
          _name: "Horizontal insulated pipe (through wall)",
          type: "triple",
          inner_diameter_ft: 0.5,
          height_ft: 1.9375,
          z_ft: 0,
          orientation: "horizontal",
          T_ambient_K: 275.15,
          Pa: 98596,
          num_segments: 2,
          thickness_inner_m: 0.0005,
          density_inner_kg_m3: 7850,
          cp_inner_J_kg_K: 460,
          k_inner_W_m_K: 26,
          epsilon_inner: 0.35,
          thickness_middle_m: 0.025,
          density_middle_kg_m3: 100,
          cp_middle_J_kg_K: 1050,
          k_middle_W_m_K: 0.04,
          thickness_outer_m: 0.0005,
          density_outer_kg_m3: 8000,
          cp_outer_J_kg_K: 500,
          k_outer_W_m_K: 16,
          epsilon_outer: 0.35,
          air_gap_inner_m: 0.0,
          air_gap_outer_m: 0.0,
          roughness_m: 1e-6
        },
        {
          _name: "Vertical insulated pipe (outdoors)",
          type: "triple",
          inner_diameter_ft: 0.5,
          height_ft: 5.917,
          z_ft: 0,
          orientation: "vertical",
          T_ambient_K: 275.15,
          Pa: 98596,
          num_segments: 8,
          thickness_inner_m: 0.0005,
          density_inner_kg_m3: 7850,
          cp_inner_J_kg_K: 460,
          k_inner_W_m_K: 26,
          epsilon_inner: 0.35,
          thickness_middle_m: 0.025,
          density_middle_kg_m3: 100,
          cp_middle_J_kg_K: 1050,
          k_middle_W_m_K: 0.04,
          thickness_outer_m: 0.0005,
          density_outer_kg_m3: 8000,
          cp_outer_J_kg_K: 500,
          k_outer_W_m_K: 16,
          epsilon_outer: 0.35,
          air_gap_inner_m: 0.0,
          air_gap_outer_m: 0.0,
          roughness_m: 1e-6
        }
      ],
      elbows: [
        {
          type: "tee",
          between_parts: [-1, 0],
          diameter_ft: 0.5,
          vertical_length_ft: 1.0,
          horizontal_length_ft: 0.5417,
          T_ambient_K: 295.15
        },
        {
          type: "elbow",
          between_parts: [0, 1],
          diameter_ft: 0.5,
          height_ft: 0.625,
          width_ft: 0.7083,
          angle_deg: 90,
          R_over_D: 1.5,
          elbow_type: "long_radius",
          T_ambient_K: 295.15
        },
        {
          type: "tee",
          between_parts: [1, 2],
          diameter_ft: 0.5,
          vertical_length_ft: 1.0,
          horizontal_length_ft: 0.5417,
          T_ambient_K: 275.15
        }
      ],
      dt: 0.5,
      total_time: 600,
      inlet_restriction: {
        enable: true,
        door_type: "swivel",
        door_width_ft: 1.2708,
        door_height_ft: 0.8229,
        Cd: 0.62,
        A_leak_m2: 0.0125,
        inlet_area_min_m2: 0.003,
        K_stove: 0.0
      },
      door_schedule: [[0, 100], [90, 100], [95, 50], [300, 50], [305, 0]],
      inlet_temp_profile: [
        [0, 473],
        [60, 523],
        [120, 548],
        [180, 523],
        [300, 473],
        [600, 423]
      ],
      verbose: false
    }
  }
];

export const elbowData = [
  { 
    name: "90 Degree Elbow", 
    type: "Elbow", 
    diameters: ["3", "4", "5", "6", "7", "8"], 
    material: "0.02\" 430 stainless steel", 
    surface: "smooth",
    description: "90° elbow fitting for directional changes. Made from 430 stainless steel with smooth interior surface."
  },
  { 
    name: "45 Degree Elbow", 
    type: "Elbow", 
    diameters: ["3", "4", "5", "6", "7", "8"], 
    material: "0.02\" 430 stainless steel", 
    surface: "smooth",
    description: "45° elbow fitting for gradual directional changes. Reduces draft resistance compared to 90° bends."
  },
  { 
    name: "Tee", 
    type: "Elbow", 
    diameters: ["3", "4", "5", "6", "7", "8"], 
    material: "0.02\" 430 stainless steel", 
    surface: "smooth",
    description: "T-junction fitting for connecting branch pipes. Features one inlet and two outlets for versatile installations."
  },
  { 
    name: "Cap", 
    type: "Elbow", 
    diameters: ["3", "4", "5", "6", "7", "8"], 
    material: "0.02\" 430 stainless steel", 
    surface: "smooth",
    description: "End cap for sealing pipe terminations. Provides weatherproof closure for chimneys."
  }
];

export const pipeData = [
  {
    name: "DuraBlack",
    orientation: ["horizontal", "vertical", "45"],
    type: "Class A",
    Insolation: "Fiber",
    diameters: ["6", "8"],
    material: "24-gauge steel",
    surface: "smooth",
    description: "Heavy-duty black stovepipe for wood-burning appliances. Features 24-gauge steel construction with fiber insulation for reliable performance."
  },
  {
    name: "DuraBlack Stainless Steel",
    orientation: ["horizontal", "vertical", "45"],
    type: "Connector",
    Insolation: "Fiber",
    diameters: ["6", "8"],
    material: "0.02\" 430 stainless steel",
    surface: "smooth",
    description: "Premium stainless steel connector pipe with superior corrosion resistance. Ideal for high-temperature applications with long-lasting durability."
  },
  {
    name: "DuraFlex Pro",
    orientation: ["horizontal", "vertical", "45"],
    type: "Class A",
    Insolation_in: "",
    Insolation_mid: "",
    Insolation_out: "",
    diameters: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    material: "0.005\" 316 stainless steel",
    surface: "corrugated",
    description: "Flexible chimney liner made from 316 stainless steel. Corrugated design allows easy installation in existing chimneys with tight bends."
  },
  {
    name: "DuraFlex SW",
    orientation: ["horizontal", "vertical", "45"],
    wallType: "Type B",
    diameters: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    material: "0.005\" overlapped stainless steel",
    surface: "smooth",
    description: "Smooth-wall flexible liner with overlapped construction. Type B rated for gas and oil applications with superior airflow characteristics."
  },
  {
    name: "DuraFlex 316",
    orientation: ["horizontal", "vertical", "45"],
    wallType: "Type B",
    diameters: ["3", "4", "5", "6", "7", "8"],
    material: "0.005\" 316 stainless steel",
    surface: "corrugated",
    description: "High-grade 316 stainless steel flexible liner. Excellent resistance to high temperatures and corrosive condensates."
  },
  {
    name: "DuraFlex 304",
    orientation: ["horizontal", "vertical", "45"],
    wallType: "Type B",
    diameters: ["3", "4", "5", "6", "7", "8"],
    material: "0.005\" 304 stainless steel",
    surface: "corrugated",
    description: "Cost-effective 304 stainless steel liner with corrugated flexibility. Suitable for medium-temperature wood-burning installations."
  },
  {
    name: "DuraTech",
    orientation: ["horizontal", "vertical", "45"],
    wallType: "Type A",
    diameters: ["5", "6", "7", "8"],
    material: "inner wall 0.02\" 430 stainless steel, middle: thermal tech blanket insulation, outer: 0.016\" 430 stainless steel or 0.021\" galvalume steel",
    surface: "smooth",
    description: "Triple-wall Class A chimney pipe with advanced thermal insulation. Features inner and outer stainless steel walls with thermal tech blanket for maximum safety clearances."
  },
  {
    name: "DuraTech LDC",
    orientation: ["horizontal", "vertical", "45"],
    wallType: "Type A",
    diameters: ["10", "12", "14", "16", "18", "20", "22", "24"],
    material: "inner: 0.027\" 430 stainless steel, middle: 1\" thermal tech insulation blanket, outer: 0.027\" 430 stainless steel or 0.029\" galvalume",
    surface: "smooth",
    description: "Large-diameter Class A chimney for commercial and large residential applications. Heavy-duty construction with 1-inch insulation blanket for high-capacity systems."
  },
  {
    name: "DVL",
    orientation: ["horizontal", "vertical", "45"],
    wallType: "Type A",
    diameters: ["6", "7", "8"],
    material: "inner: 0.16\" stainless steel, outer: 0.18\" galvanized",
    surface: "smooth",
    description: "Direct Vent Liner for factory-built fireplaces. Dual-wall construction with stainless inner wall and galvanized outer wall for efficient venting."
  },
  {
    name: "USP Ultimate StovePipe",
    orientation: ["horizontal", "vertical", "45"],
    wallType: "Type A",
    diameters: ["6", "7", "8"],
    material: "inner: 0.016\" 430 stainless steel, middle: 7/16\" air space, outer: 0.018\" satin coat steel",
    surface: "smooth",
    description: "Premium double-wall stovepipe with air-insulated design. Satin coat finish provides attractive appearance while maintaining safe clearances to combustibles."
  }
];