import { writable, derived } from 'svelte/store'
import _ from 'data/language'
import user from 'data/user'
import HotRunner from 'screens/dashboard/cards/HotRunner'
import Image from 'screens/dashboard/cards/Image'
import Mold from 'screens/dashboard/cards/Mold'
import Order from 'screens/dashboard/cards/Order'
import EZ from 'screens/dashboard/cards/datavis/EZ'
import Line from 'screens/dashboard/cards/datavis/Line'
import Mini from 'screens/dashboard/cards/datavis/Mini'
import FaultAnalysis from 'screens/dashboard/cards/FaultAnalysis'
import WiringAnalysis from 'screens/dashboard/cards/WiringAnalysis'
import { activeActivityLog } from 'data/activitylog'
import { cardOrder } from './ordering'
import { enabled } from './enabled'

// TODO: make dynamic and extract into its own js module
const enabledModules = writable([ 'hot_runner' ])

export const dashboardData = derived([ _, enabledModules ], ([ $_, $enabledModules ]) => {
  return {
    main: {
      controller_functions: {
        title: $_('Controller Functions'),
        description: $_('These controller functions are currently installed in the system. Use these cards to access the settings of each of the controllers.'),
        cards: {
          hot_runner: {
            title: $_('Hot Runner'),
            component: HotRunner,
            mandatory: true,
            enabled: $enabledModules.includes('hot_runner'),
            span: 2,
            link: '/hot-runner',
            unrestricted: true
          },
          balancing: {
            title: $_('Balancing'),
            mandatory: true,
            enabled: $enabledModules.includes('balancing'),
            span: 2,
            link: '/balancing'
          },
          monitoring: {
            title: $_('Monitoring'),
            mandatory: true,
            enabled: $enabledModules.includes('monitoring'),
            span: 2,
            link: '/monitoring'
          },
          valve_pin: {
            title: $_('Valve Pin'),
            mandatory: true,
            enabled: $enabledModules.includes('balancing'),
            span: 2,
            link: '/valve-pin'
          }
        }
      },

      mold_process_order: {
        title: $_('Mold, Process, Order'),
        description: $_('These options display live data and provide the ability to select zones and edit the process.'),
        cards: {
          mold_and_process: {
            title: $_('Mold & Process'),
            component: Mold,
            unrestricted: true
          },
          images: {
            title: $_('Images'),
            component: Image,
            unrestricted: true
          },
          order: {
            title: $_('Order'),
            component: Order,
            span: 2,
            unrestricted: true
          }
        }
      },

      tools_and_diagnostics: {
        title: $_('Tools & Diagnostics'),
        cards: {
          recent_activity: {
            title: $_('Recent Activity'),
            icon: 'recentActivity',
            onClick: () => activeActivityLog.set(true)
          },
          inputs_outputs: {
            title: $_('Inputs & Outputs'),
            icon: 'inputOutput',
          },
          cycle_data: {
            title: $_('Cycle Data'),
            icon: 'cycleData'
          },
          hardware_configuration: {
            title: $_('Hardware Configuration'),
            icon: 'hardwareConfig'
          }
        }
      },

      general: {
        title: $_('General'),
        cards: {
          network_settings: {
            title: $_('Network Settings'),
            icon: 'network',
          },
          units: {
            title: $_('Units'),
            icon: 'units',
          },
          user_management: {
            title: $_('User Management'),
            icon: 'userManagement',
            link: '/manage-users',
          },
          saved_files: {
            title: $_('Saved Files'),
            icon: 'fileFolder',
          }
        }
      }
    },

    hot_runner: {

      live_data_cards: {
        title: $_('Live Data Cards'),
        selector: true,
        cards: {
          minicontroller: {
            title: $_('Minicontroller'),
            description: $_('Basic zone data in card format'),
            component: Mini
          },
          ez: {
            title: $_('EZ Screen'),
            description: $_('Basic zone data in table format'),
            component: EZ
          },
          line_graph: {
            title: $_('Line Graph'),
            description: $_('Advanced view of zone data in line graph'),
            component: Line
          }
        }
      },

      process_and_hardware: {
        title: $_('Process and Hardware Settings'),
        cards: {
          group_management: {
            title: $_('Group Management'),
            icon: 'groupManagement',
            link: '/group-management'
          },
          zone_names: {
            title: $_('Zone Names'),
            icon: 'zoneNames',
            link: '/zone-names'
          },
          material_database: {
            title: $_('Material Database'),
            icon: 'materialDatabase',
            link: '/material/material-db'
          },
        }
      },

      tools_and_diagnostics: {
        title: $_('Tools & Diagnostics'),
        cards: {
          wiring_analysis: {
            title: $_('Wiring Analysis'),
            conponent: WiringAnalysis
          },
          wiring_analysis: {
            title: $_('Fault Analysis'),
            conponent: FaultAnalysis
          }
        }
      },
    }
  }
})


// get current dashboard layout state, based on dashboard/group/card definitions and the current user
const dashboards = derived([ dashboardData, user, cardOrder, enabled ], ([ data, $user, $order, $enabled ]) => {
  const params = { $user, $order, $enabled }
  let customized = {}
  for(let dashboard of Object.keys(data)) {
    customized[dashboard] = {}
    let groups = []
    for(let [ group, g ] of Object.entries(data[dashboard])) {
      let cards = []
      for(let [ card, c ] of Object.entries(g.cards)) {
        cards.push({ name: card, ...c })
      }
      groups.push({
        name: group,
        ...g,
        cards: getCards(params, dashboard, group, cards)
      })
    }
    customized[dashboard].groups = getGroups($order, dashboard, groups)
  }
  return customized
})

export default dashboards




const orderItems = (order, items) => {
  let ordered = []

  // pull out items in specified order
  for(let name of order) {
    ordered.push(items.find(x => x.name == name))
  }

  // filter out any undefined items (name in order, but not in items)
  ordered = ordered.filter(x => !!x)

  // tack unsorted/unknown items to the end
  ordered = ordered.concat(items.filter(item => !ordered.find(x => x.name == item.name)))

  return ordered
}



// get sorted groups
const getGroups = ($order, dashboard, groups) => {
  const o = $order && $order[dashboard] && $order[dashboard].order || []
  return orderItems(o, groups)
}


// get sorted cards, restricted by permissions and preferences
const getCards = ({ $user, $order, $enabled }, dashboard, group, cards) => {
  const groups = $order && $order[dashboard] && $order[dashboard].groups
  const userOrder = groups && groups[group] && groups[group].order || []

  const ordered = orderItems(userOrder, cards)

  const isAccessible = card => {
    const active = $enabled && $enabled[dashboard]
      && $enabled[dashboard][group] && $enabled[dashboard][group][card.name]

    if(active === false) return false
    if(card.enabled === false) return false
    return card.unrestricted || $user
  }

  return ordered.filter(isAccessible)
}

