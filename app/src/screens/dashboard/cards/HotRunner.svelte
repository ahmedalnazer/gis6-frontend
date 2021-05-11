<script>
  import { onMount, onDestroy } from 'svelte'
  import Card from './Card.svelte'
  import CheckCircle from "style/images/CheckCircle.svelte"
  import api from "data/api"
  import zones from 'data/zones'
  import _ from 'data/language'
  import { Icon } from 'components'

  let hrValue = {}
  let hrHigherZoneTemp = 0
  let hrLowerZoneTemp = 0
  let hrHigherZone = ""
  let hrLowerZone = ""
  let orderId = 175
  let longPollingInterval = 5000


  let min = {}
  let max = {}
  $: {
    for(let z of $zones) {
      if(!min.actual_temp || z.actual_temp < min.actual_temp) {
        min = z
      }
      if(!max.actual_temp || z.actual_temp > max.actual_temp) {
        max = z
      }
    }
  }
</script>

<Card link='/hot-runner' footerIcon={false}>
    <div class="sectionHeader">
        <div class='icon'>
          <Icon icon="checkmarkcircle" color="var(--green)" size="1em" />
        </div>
        <div>{$_('Hot Runner')}</div>
    </div>
    <div class="zoneContainer">
        <!-- <div class="center">
            <div>
                <div class="zoneTemp">{(max.actual_temp || 0) / 10} C</div>
                <div class="zoneInfo">Highest {max.name || '-'}</div>
            </div>
            <div>
                <div class="zoneTemp">{(min.actual_temp || 0) / 10} C</div>
                <div class="zoneInfo">Lowest {min.name || '-'}</div>
            </div>
        </div>

        <div class="zoneInfo">Polypropylene | Range 250-270 C</div> -->
        <div class="hot-items heaters">
          <div>
            <p class="zoneTemp">60</p>
            <p class="zoneInfo">{$_('Heaters')}</p>
          </div>
          <div class="group-zone-count">
            <p><b>20</b> <span>{$_('Tips')}</span></p>
            <p><b>20</b> <span>{$_('Manifolds')}</span></p>
            <p><b>20</b> <span>{$_('Sprues')}</span></p>
          </div>
        </div>
        <div class="hot-items">
          <div class="temp">
            <Icon icon='uparrow' size="1em" />
            <div class="zoneTemp">{(max.actual_temp || 0) / 10}&deg;C</div>
          </div>
          <div class="zoneInfo">{$_('Highest Temp')}</div>
        </div>
        <div class="hot-items">
          <p class="zoneTemp">0</p>
          <p class="zoneInfo">{$_('Faults')}</p>
        </div>
        <div class="hot-items">
          <div class="temp">
            <Icon icon='downarrow' size="1em" />
            <div class="zoneTemp">{(min.actual_temp || 0) / 10}&deg;C</div>
          </div>
          <div class="zoneInfo">{$_('Lowest Temp')}</div>
        </div>
    </div>
</Card>


<style lang="scss">
  .center {
    margin: auto;
    width: 80%;
    padding: 10px;
  }
  .sectionHeader {
    border-top: 7px solid var(--green);
    display: flex;
    align-items: center;
    margin: -16px;
    margin-bottom: 0;
    padding: 16px;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 27px;
  }
  .icon {
    margin-right: 10px;
    margin-top: 6px;
  }
  .zoneContainer {
    padding-top: 20px;
    padding-bottom: 13px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 25px;
    .zoneTemp {
      font-size: 40px;
      letter-spacing: 0;
      line-height: 55px;
    }
    .zoneInfo {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 0;
      line-height: 22px;
      padding-bottom: 10px;
      text-transform: uppercase;
    }
    .hot-items {
      border-left: 6px solid var(--darkBlue);
      padding-left: 16px;
      .temp {
        display: flex;
        margin-bottom: 16px;
        align-items: center;
        justify-content: flex-start;
        :global(svg) {
          width: 24px;
          margin-right: 10px;
          margin-top: 5px;
        }
      }
    }
    .heaters {
      display: flex;
      .group-zone-count {
        margin-left: 12px;
        p {
          font-size: 15px;
          letter-spacing: 0;
          line-height: 22px;
          span {
            font-weight: 100;
            text-transform: uppercase;
          }
        }
      }
    }
  }
</style>