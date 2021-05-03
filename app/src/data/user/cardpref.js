import { writable } from 'svelte/store'


const userCardData = [
    {
        UserType: 0,
        UserCards: [
                { id:1, Title:"Hot Runner", CardName: "HOT_RUNNER", Enabled: true, Editable: false, CardType : "CONTROLLER_FUNCTIONS" },
                { id:2, Title:"Balancing", CardName: "BALANCING", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS" },
                { id:3, Title:"Monitoring", CardName: "MONITORING", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS" },
                { id:4, Title:"Valve Pin", CardName: "VALVE_PIN", Enabled: false, Editable: true, CardType : "CONTROLLER_FUNCTIONS" },
                { id:5, Title:"Mold", CardName: "MOLD", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER" },
                { id:6, Title:"Process", CardName: "PROCESS", Enabled: false, Editable: true, CardType : "MOLD_PROCESS_ORDER" },
                { id:7, Title:"Images", CardName: "IMAGES", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER" },
                { id:8, Title:"Order", CardName: "ORDER", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER" },
                { id:9, Title:"Recent Activity", CardName: "RECENT_ACTIVITY", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS" },
                { id:10, Title:"Inputs/Outputs", CardName: "INPUTS_OUTPUTS", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS" },
                { id:11, Title:"Historic Data", CardName: "HISTORICAL_DATA", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS" },
                { id:12, Title:"Material Database", CardName: "MATERIAL_DATABASE", Enabled: false, Editable: true, CardType : "TOOLS_DIAGNOSTICS" },
                { id:13, Title:"Network Settings", CardName: "NETWORK_SETTINGS", Enabled: false, Editable: true, CardType : "GENERAL" },
                { id:14, Title:"Units", CardName: "UNITS", Enabled: false, Editable: true, CardType : "GENERAL" },
                { id:15, Title:"Reports & Files", CardName: "REPORTS_FILES", Enabled: false, Editable: true, CardType : "GENERAL" },
                { id:16, Title:"User Management", CardName: "USER_MANAGEMENT", Enabled: false, Editable: true, CardType : "GENERAL" }
        ]
    },
    {
    UserType: 1,
    UserCards: [
            { id:1, Title:"Hot Runner", CardName: "HOT_RUNNER", Enabled: true, Editable: true, CardType : "CONTROLLER_FUNCTIONS" },
            { id:2, Title:"Balancing", CardName: "BALANCING", Enabled: true, Editable: true, CardType : "CONTROLLER_FUNCTIONS" },
            { id:3, Title:"Monitoring", CardName: "MONITORING", Enabled: true, Editable: true, CardType : "CONTROLLER_FUNCTIONS" },
            { id:4, Title:"Valve Pin", CardName: "VALVE_PIN", Enabled: true, Editable: true, CardType : "CONTROLLER_FUNCTIONS" },
            { id:5, Title:"Mold", CardName: "MOLD", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER" },
            { id:6, Title:"Process", CardName: "PROCESS", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER" },
            { id:7, Title:"Images", CardName: "IMAGES", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER" },
            { id:8, Title:"Order", CardName: "ORDER", Enabled: true, Editable: true, CardType : "MOLD_PROCESS_ORDER" },
            { id:9, Title:"Recent Activity", CardName: "RECENT_ACTIVITY", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS" },
            { id:10, Title:"Inputs/Outputs", CardName: "INPUTS_OUTPUTS", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS" },
            { id:11, Title:"Historic Data", CardName: "HISTORICAL_DATA", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS" },
            { id:12, Title:"Material Database", CardName: "MATERIAL_DATABASE", Enabled: true, Editable: true, CardType : "TOOLS_DIAGNOSTICS" },
            { id:13, Title:"Network Settings", CardName: "NETWORK_SETTINGS", Enabled: true, Editable: true, CardType : "GENERAL" },
            { id:14, Title:"Units", CardName: "UNITS", Enabled: true, Editable: true, CardType : "GENERAL" },
            { id:15, Title:"Reports & Files", CardName: "REPORTS_FILES", Enabled: true, Editable: true, CardType : "GENERAL" },
            { id:16, Title:"User Management", CardName: "USER_MANAGEMENT", Enabled: true, Editable: true, CardType : "GENERAL" }
    ]
}]

export const cardEditor = writable('')
export const userCardPref = writable(userCardData)

