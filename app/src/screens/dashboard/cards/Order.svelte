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
        <div class="progres-bar">
          <ProgressBar
            style='radial'
            series={[{
              perc: 55,
              color: '#364860'
            }]}
            thickness={17}
            width={75}
          />
          <div>
            <p class="count">0</p>
            <p class="status-label">{$_('Days left')}</p>
          </div>
        </div>
      </div>
      <div class="scroll-bar">
        <ProgressBar
        series={[0, 10]}
          thresholds={[
            { perc: 0, valueLabel: '0l', color: '#364860' },
            { perc: 10, valueLabel: '10j', color: '#364860' },
            { perc: 100, valueLabel: '100g', color: '#364860' }
          ]}
          textSize={10}
          width={450}
          height={20}
          rx={10}
          ry={10}
          labelAlignX={'left'}
          labelAlignY={'below'}

          labelColor={'red'}
          invLabelColor={'blue'}
        />
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
      .progres-bar {
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
    .scroll-bar {
      margin-top: 34px;
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