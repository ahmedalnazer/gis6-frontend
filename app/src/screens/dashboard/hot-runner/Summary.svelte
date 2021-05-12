<script>
  import { Icon } from 'components'
  import zones from 'data/zones'
  import _ from 'data/language'
  import convert from 'data/language/units'

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

<div class='zone-summary-container'>
  <div class='zone-summary-title'>
    {$_('Zone Summary')}
  </div>

  <div class="zone-summary-body">
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
    <div class="hot-items">
      <div class="temp">
        <div>
          <Icon icon='downarrow' size="30px" />
          <span class="zone-temp">{$convert({ type: 'temp', value: min.actual_temp || 0 })}</span>
        </div>
      </div>
      <div class="zone-info zone-info-temp">{$_('LOWEST TEMP')}</div>
    </div>

    <div class="hot-items">
      <div class="temp">
        <div>
          <Icon icon='uparrow' size="30px" />
          <span class="zone-temp">{$convert({ type: 'temp', value: max.actual_temp || 0 })}</span>
        </div>
      </div>
      <div class="zone-info zone-info-temp">{$_('HIGHEST TEMP')}</div>
    </div>

    <div class="hot-items">
      <div class="zone-temp">{$zones.filter(x => x.hasAlarm).length}</div>
      <div class="zone-info zone-info-faults">{$_('FAULTS')}</div>
    </div>
  </div>



  <!-- <div class="zone-summary-body">

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
  </div> -->

</div>

<style lang="scss">

.zone-summary-container {
    height: 180px;
    border-radius: 2px;
    background-color: #F5F6F9;
    grid-column: span 4 / auto;
      // border: 1px solid indianred;
  }

  .zone-summary-title{
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 0;
    line-height: 30px;
    padding: 11px 10px 20px 19px;
  }


  .zone-summary-body {
    // border: 1px solid indianred;
    // padding-top: 20px;
    // padding-bottom: 13px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);

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
