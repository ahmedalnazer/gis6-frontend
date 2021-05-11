<script>
  import Card from './Card.svelte'
  import _ from 'data/language'
  import ProgressBar from "@okrad/svelte-progressbar"
</script>

<Card>
  <div class='container'>
    <div class='labels'>
      <h2>{$_('Order: No current order')}</h2>
    </div>
    <div class='order-status'>
      <div class="status">
        <div class="with-border">
          <p class="count">0</p>
          <p class="status-label">{$_('Parts')}</p>
        </div>
        <div class="progres-bar-radial">
          <ProgressBar
            style='radial'
            series={[{
              perc: 0,
              color: '#364860'
            }]}
            thickness={17}
            width={75}
            textSize={0}
          />
          <div>
            <p class="count">0</p>
            <p class="status-label">{$_('Days left')}</p>
          </div>
        </div>
      </div>
      <div class="progres-bar-liner">
        <ProgressBar
        series={[0]}
          thresholds={[
            { perc: 0, color: '#364860' },
            { perc: 10, color: '#364860' },
            { perc: 100, color: '#364860' }
          ]}
          textSize={0}
          width={450}
          height={20}
          rx={10}
          ry={10}
        />
        <div class="progres-bar-liner-labels">
          <span>0</span>
          <!-- <span>76,000</span>
          <span>152,000</span> -->
        </div>
      </div>
      <div class="setup-order-btn">
        <button>{$_('Setup Order')}</button>
      </div>
    </div>
  </div>
</Card>

<style lang="scss">
  .order-status {
    margin-top: 60px;
    
    .status {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-gap: 10px;
      .with-border {
        border-left: 5px solid #E0E2E7;
        padding-left: 16px;
      }
      .progres-bar-radial {
        display: grid;
        grid-template-columns: 0.4fr 1fr;
        grid-gap: 15px;
        :global(svg) {
          margin-top: -4px;
        }
      }
      .count {
        font-size: 36px;
        letter-spacing: 0;
        line-height: 30px;
      }
      .status-label {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0;
        line-height: 19px;
        color: var(--textSecondary)
      }
    }
    .progres-bar-liner {
      margin-top: 34px;
      .progres-bar-liner-labels {
        margin-top: 5px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        span{
          color: #666666;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0;
          line-height: 17px;
        }
      }
    }
    .setup-order-btn {
      text-align: right;
      margin-top: 45px;
      button {
        box-sizing: border-box;
        padding: 25px 50px;
        border: 2px solid #358DCA;
        border-radius: 1px;
        background-color: #FFFFFF;
        box-shadow: 2px 2px 5px 0 rgba(54,72,96,0.5);
        color: #358DCA;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: 0;
        line-height: 18px;
        text-align: center;
      }
    }
  }
</style>