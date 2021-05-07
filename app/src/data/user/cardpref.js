import { writable } from 'svelte/store'

const userCardData = [
    {
        UserType: 0,
        UserCards: [
            { id:1, Title:"Hot Runner", CardName: "HOT_RUNNER", Enabled: true, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 1 },
            { id:2, Title:"Balancing", CardName: "BALANCING", Enabled: false, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 2 },
            { id:3, Title:"Monitoring", CardName: "MONITORING", Enabled: false, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 3 },
            { id:4, Title:"Valve Pin", CardName: "VALVE_PIN", Enabled: false, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 4 },
            { id:5, Title:"Mold & Process", CardName: "MOLD", Enabled: true, Editable: false, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 5 },
            { id:7, Title:"Images", CardName: "IMAGES", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 7 },
            { id:8, Title:"Order", CardName: "ORDER", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 8 },
            { id:9, Title:"Recent Activity", CardName: "RECENT_ACTIVITY", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 9 },
            { id:10, Title:"Inputs/Outputs", CardName: "INPUTS_OUTPUTS", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 10 },
            { id:11, Title:"Historic Data", CardName: "HISTORICAL_DATA", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 11 },
            { id:12, Title:"Material Database", CardName: "MATERIAL_DATABASE", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 12 },
            { id:13, Title:"Network Settings", CardName: "NETWORK_SETTINGS", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 13 },
            { id:14, Title:"Units", CardName: "UNITS", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 14 },
            { id:15, Title:"Reports & Files", CardName: "REPORTS_FILES", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 15 },
            { id:16, Title:"User Management", CardName: "USER_MANAGEMENT", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 16 }
        ]
    },
    {
        UserType: 1,
        UserCards: [
            { id:1, Title:"Hot Runner", CardName: "HOT_RUNNER", Enabled: true, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 1 },
            { id:2, Title:"Balancing", CardName: "BALANCING", Enabled: false, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 2 },
            { id:3, Title:"Monitoring", CardName: "MONITORING", Enabled: false, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 3 },
            { id:4, Title:"Valve Pin", CardName: "VALVE_PIN", Enabled: false, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 4 },
            { id:5, Title:"Mold & Process", CardName: "MOLD", Enabled: true, Editable: false, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 5 },
            { id:7, Title:"Images", CardName: "IMAGES", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 7 },
            { id:8, Title:"Order", CardName: "ORDER", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 8 },
            { id:9, Title:"Recent Activity", CardName: "RECENT_ACTIVITY", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 9 },
            { id:10, Title:"Inputs/Outputs", CardName: "INPUTS_OUTPUTS", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 10 },
            { id:11, Title:"Historic Data", CardName: "HISTORICAL_DATA", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 11 },
            { id:12, Title:"Material Database", CardName: "MATERIAL_DATABASE", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 12 },
            { id:13, Title:"Network Settings", CardName: "NETWORK_SETTINGS", Enabled: true, Editable: true, CardType : "GENERAL", ItemOrder: 13 },
            { id:14, Title:"Units", CardName: "UNITS", Enabled: false, Editable: false, CardType : "GENERAL", ItemOrder: 14 },
            { id:15, Title:"Reports & Files", CardName: "REPORTS_FILES", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 15 },
            { id:16, Title:"User Management", CardName: "USER_MANAGEMENT", Enabled: true, Editable: true, CardType : "GENERAL", ItemOrder: 16 },
            { id: 19, Title: "Saved Files", CardName: "SAVED_FILES", Enabled: true, Editable: true, CardType: "GENERAL", ItemOrder: 19 }
        ]
    },
    {
        UserType: 2,
        UserCards: [
            { id:1, Title:"Hot Runner", CardName: "HOT_RUNNER", Enabled: true, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 1 },
            { id:2, Title:"Balancing", CardName: "BALANCING", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 2 },
            { id:3, Title:"Monitoring", CardName: "MONITORING", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 3 },
            { id:4, Title:"Valve Pin", CardName: "VALVE_PIN", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 4 },
            { id:5, Title:"Mold & Process", CardName: "MOLD", Enabled: true, Editable: false, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 5 },
            { id:6, Title:"Process", CardName: "PROCESS", Enabled: false, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 6 },
            { id:7, Title:"Images", CardName: "IMAGES", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 7 },
            { id:8, Title:"Order", CardName: "ORDER", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 8 },
            { id:9, Title:"Recent Activity", CardName: "RECENT_ACTIVITY", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 9 },
            { id:10, Title:"Inputs/Outputs", CardName: "INPUTS_OUTPUTS", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 10 },
            { id:11, Title:"Historic Data", CardName: "HISTORICAL_DATA", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 11 },
            { id:12, Title:"Material Database", CardName: "MATERIAL_DATABASE", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 12 },
            { id:13, Title:"Network Settings", CardName: "NETWORK_SETTINGS", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 13 },
            { id:14, Title:"Units", CardName: "UNITS", Enabled: false, Editable: false, CardType : "GENERAL", ItemOrder: 14 },
            { id:15, Title:"Reports & Files", CardName: "REPORTS_FILES", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 15 },
            { id:16, Title:"User Management", CardName: "USER_MANAGEMENT", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 16 }
        ]
    },
    {
        UserType: 3,
        UserCards: [
            { id:1, Title:"Hot Runner", CardName: "HOT_RUNNER", Enabled: true, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 1 },
            { id:2, Title:"Balancing", CardName: "BALANCING", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 2 },
            { id:3, Title:"Monitoring", CardName: "MONITORING", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 3 },
            { id:4, Title:"Valve Pin", CardName: "VALVE_PIN", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 4 },
            { id:5, Title:"Mold & Process", CardName: "MOLD", Enabled: true, Editable: false, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 5 },
            { id:7, Title:"Images", CardName: "IMAGES", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 7 },
            { id:8, Title:"Order", CardName: "ORDER", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 8 },
            { id:9, Title:"Recent Activity", CardName: "RECENT_ACTIVITY", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 9 },
            { id:10, Title:"Inputs/Outputs", CardName: "INPUTS_OUTPUTS", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 10 },
            { id:11, Title:"Historic Data", CardName: "HISTORICAL_DATA", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 11 },
            { id:12, Title:"Material Database", CardName: "MATERIAL_DATABASE", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 12 },
            { id:13, Title:"Network Settings", CardName: "NETWORK_SETTINGS", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 13 },
            { id:14, Title:"Units", CardName: "UNITS", Enabled: false, Editable: false, CardType : "GENERAL", ItemOrder: 14 },
            { id:15, Title:"Reports & Files", CardName: "REPORTS_FILES", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 15 },
            { id:16, Title:"User Management", CardName: "USER_MANAGEMENT", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 16 },
            { id:17, Title:"Cycle Data", CardName: "CYCLE_DATA", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 17 },
            { id:18, Title:"Hardware Configuration", CardName: "HARDWARE_CONFIG", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 18 },
            { id:19, Title:"Saved Files", CardName: "SAVED_FILES", Enabled: true, Editable: true, CardType : "GENERAL", ItemOrder: 19 }
        ]
    },
    {
        UserType: 4,
        UserCards: [
            { id:1, Title:"Hot Runner", CardName: "HOT_RUNNER", Enabled: true, Editable: false, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 1 },
            { id:2, Title:"Balancing", CardName: "BALANCING", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 2 },
            { id:3, Title:"Monitoring", CardName: "MONITORING", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 3 },
            { id:4, Title:"Valve Pin", CardName: "VALVE_PIN", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 4 },
            { id:5, Title:"Mold & Process", CardName: "MOLD", Enabled: true, Editable: false, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 5 },
            { id:7, Title:"Images", CardName: "IMAGES", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 7 },
            { id:8, Title:"Order", CardName: "ORDER", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 8 },
            { id:9, Title:"Recent Activity", CardName: "RECENT_ACTIVITY", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 9 },
            { id:10, Title:"Inputs/Outputs", CardName: "INPUTS_OUTPUTS", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 10 },
            { id:11, Title:"Historic Data", CardName: "HISTORICAL_DATA", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 11 },
            { id:12, Title:"Material Database", CardName: "MATERIAL_DATABASE", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 12 },
            { id:13, Title:"Network Settings", CardName: "NETWORK_SETTINGS", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 13 },
            { id:14, Title:"Units", CardName: "UNITS", Enabled: false, Editable: false, CardType : "GENERAL", ItemOrder: 14 },
            { id:15, Title:"Reports & Files", CardName: "REPORTS_FILES", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 15 },
            { id:16, Title:"User Management", CardName: "USER_MANAGEMENT", Enabled: false, Editable: true, CardType : "GENERAL", ItemOrder: 16 }
        ]
    },
    {
        UserType: 5,
        UserCards: [
            { id:1, Title:"Hot Runner", CardName: "HOT_RUNNER", Enabled: true, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 1 },
            { id:2, Title:"Balancing", CardName: "BALANCING", Enabled: true, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 2 },
            { id:3, Title:"Monitoring", CardName: "MONITORING", Enabled: true, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 3 },
            { id:4, Title:"Valve Pin", CardName: "VALVE_PIN", Enabled: true, Editable: true, CardType : "CONTROLLER_FUNCTIONS", ItemOrder: 4 },
            { id:5, Title:"Mold & Process", CardName: "MOLD", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 5 },
            { id:7, Title:"Images", CardName: "IMAGES", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 7 },
            { id:8, Title:"Order", CardName: "ORDER", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER", ItemOrder: 8 },
            { id:9, Title:"Recent Activity", CardName: "RECENT_ACTIVITY", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 9 },
            { id:10, Title:"Inputs/Outputs", CardName: "INPUTS_OUTPUTS", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 10 },
            { id:11, Title:"Historic Data", CardName: "HISTORICAL_DATA", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 11 },
            { id:12, Title:"Material Database", CardName: "MATERIAL_DATABASE", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS", ItemOrder: 12 },
            { id:13, Title:"Network Settings", CardName: "NETWORK_SETTINGS", Enabled: true, Editable: true, CardType : "GENERAL", ItemOrder: 13 },
            { id:14, Title:"Units", CardName: "UNITS", Enabled: true, Editable: true, CardType : "GENERAL", ItemOrder: 14 },
            { id:15, Title:"Reports & Files", CardName: "REPORTS_FILES", Enabled: true, Editable: true, CardType : "GENERAL", ItemOrder: 15 },
            { id:16, Title:"User Management", CardName: "USER_MANAGEMENT", Enabled: true, Editable: true, CardType : "GENERAL", ItemOrder: 16 }
        ]
    }
]

export const cardEditor = writable('')
export const userCardPref = writable(userCardData)

