<script>
  import { onMount, onDestroy } from 'svelte'
  import Card from './Card'
  import CheckCircle from "style/images/CheckCircle.svelte"

  import api from "data/api"

  let hrValue = {}
  let hrHigherZoneTemp = 0
  let hrLowerZoneTemp = 0
  let hrHigherZone = ""
  let hrLowerZone = ""
  let orderId = 175
  let longPollingInterval = 5000

  const getData = async () => {
    const data = await api.get(`system/${orderId}/getminmax`)
    if (data) {
      hrLowerZoneTemp = data.min / 100
      hrHigherZoneTemp = data.max / 100
      hrLowerZone = data.min_zone
      hrHigherZone = data.max_zone
      hrValue = data
    }
  }

  let intvl

  onMount(() => {
    intvl = setInterval(function () {
      // Use long polling
      getData()
    }, longPollingInterval)
  })

  onDestroy(() => clearInterval(intvl))
</script>

<Card>
    <div class="sectionHeader">
        <div class='icon'>
            <CheckCircle size="1.5em" />
        </div>
        <div>Hot Runner</div>
    </div>
    <div class="zoneContainer">
        <div class="center">
            <div>
                <div class="zoneTemp">{hrHigherZoneTemp} C</div>
                <div class="zoneInfo">Highest {hrHigherZone}</div>
            </div>
            <div>
                <div class="zoneTemp">{hrLowerZoneTemp} C</div>
                <div class="zoneInfo">Lowest {hrLowerZone}</div>
            </div>
        </div>

        <div class="zoneInfo">Polypropylene | Range 250-270 C</div>
    </div>
</Card>


<style>
    .zoneTemp {
        font-size: 25px;
        text-align: center;
    }

    .zoneInfo {
        font-size: 14px;
        color: #70777f;
        text-align: center;
        line-height: 19px;
        padding-bottom: 10px;
    }

    .center {
        margin: auto;
        width: 80%;
        padding: 10px;
    }

    .sectionHeader {
        background-color: var(--green);
        color: #ffffff;
        height: 60px;
        display: flex;
        align-items: center;
        margin: -16px;
        margin-bottom: 0;
        padding: 16px;
    }

    .icon {
      margin-right: 10px;
    }

    .zoneContainer {
      padding: 8px 8px 13px 8px;
    }
</style>