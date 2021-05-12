<script>
  import { Icon } from 'components'
  import zones from 'data/zones'
  import _ from 'data/language'
  import convert from 'data/language/units'

  $: minTemp = $zones.reduce((min, zone) => !min ? zone.actual_temp : Math.min(zone.actual_temp, min), null)
  $: maxTemp = $zones.reduce((max, zone) => Math.max(zone.actual_temp, max), 0)

</script>

    <div class="hot-items heaters">
      <div>
        <div class="zone-temp">60</div>
        <div class="zone-info zone-info-heaters">{$_('HEATERS')}</div>
      </div>
      <div class="group-zone-count">
        <div><b>20</b> <span>{$_('TIPS')}</span></div>
        <div><b>20</b> <span>{$_('MANIFOLDS')}</span></div>
        <div><b>20</b> <span>{$_('SPRUES')}</span></div>
      </div>
    </div>
    <div class="hot-items min">
      <div class="temp">
        <div>
          <Icon icon='downarrow' size="30px" />
          <span class="zone-temp">{$convert({ type: 'temp', value: minTemp, precision: 0 })}</span>
        </div>
      </div>
      <div class="zone-info zone-info-temp">{$_('LOWEST TEMP')}</div>
    </div>

    <div class="hot-items max">
      <div class="temp">
        <div>
          <Icon icon='uparrow' size="30px" />
          <span class="zone-temp">{$convert({ type: 'temp', value: maxTemp, precision: 0 })}</span>
        </div>
      </div>
      <div class="zone-info zone-info-temp">{$_('HIGHEST TEMP')}</div>
    </div>

    <div class="hot-items faults">
      <div class="zone-temp">{$zones.filter(x => x.hasAlarm).length}</div>
      <div class="zone-info zone-info-faults">{$_('FAULTS')}</div>
    </div>

<style lang="scss">

  .zone-temp {
      font-size: 40px;
      letter-spacing: 0;
      line-height: 55px;
      padding-top: 5px;
      padding-bottom: 5px;
      // border: 1px solid indianred;
    }
    .zone-info {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 0;
      line-height: 22px;
      padding-bottom: 10px;
      text-transform: uppercase;
    }
    .zone-info-temp {
      padding-top: 10px;
    }
    .hot-items {
      border-left: 6px solid var(--darkBlue);
      padding-left: 16px;
      height: 92px;
      // border: 1px solid indianred;
    }
    .heaters {
      display: flex;
      .group-zone-count {
        margin-left: 20px;
        div {
          font-size: 15px;
          letter-spacing: 0;
          line-height: 22px;
          padding-top: 4px;
          padding-bottom: 4px;
      // border: 1px solid indianred;
        }
      }
    }






  // .zone-summary-body {
  //   padding-top: 20px;
  //   padding-bottom: 13px;
  //   display: grid;
  //   grid-template-columns: repeat(4, 1fr);
  //   grid-gap: 25px;
  //   .zoneTemp {
  //     font-size: 40px;
  //     letter-spacing: 0;
  //     line-height: 55px;
  //     border: 1px solid indianred;
  //   }
  //   .zoneInfo {
  //     font-size: 16px;
  //     font-weight: bold;
  //     letter-spacing: 0;
  //     line-height: 22px;
  //     // padding-bottom: 10px;
  //     text-transform: uppercase;
  //   }
  //   .hot-items {
  //     border-left: 6px solid var(--darkBlue);
  //     padding-left: 16px;
  //     .temp {
  //       display: flex;
  //       margin-bottom: 16px;
  //       align-items: center;
  //       justify-content: flex-start;
  //       :global(svg) {
  //         width: 24px;
  //         margin-right: 10px;
  //         margin-top: 5px;
  //       }
  //     }
  //   }
  //   .heaters {
  //     display: flex;
  //     .group-zone-count {
  //       margin-left: 12px;
  //       p {
  //         font-size: 15px;
  //         letter-spacing: 0;
  //         line-height: 22px;
  //         span {
  //           font-weight: 100;
  //           text-transform: uppercase;
  //         }
  //       }
  //     }
  //   }
  // }

</style>
