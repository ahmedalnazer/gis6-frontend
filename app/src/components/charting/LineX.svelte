<script>
  export let scaleData, position
  $: start = scaleData.xMin
  $: end = scaleData.xMax

  $: range = end - start

  let interval = 0
  let set = []

  // find first round number that's an acceptable interval for the given range
  $: {
    const factors = [ 1, 2, 5 ]
    let found = false
    for(let i = 1; i < 10; i++) {
      if(found) break
      const base = Math.pow(10, i)
      for(let f of factors) {
        let intvl = f * base
        if(range / intvl < 12) {
          interval = intvl
          found = true
          break
        }
      }
    }
  }

  let grid

  const getLine = time => {
    const t = new Date(time)
    let h = ''+t.getHours()
    let m = ''+t.getMinutes()
    let s = ''+t.getSeconds()
    const left = (time - start) / range * (grid ? grid.offsetWidth : 1)

    const transition = 200

    let opacity = 1
    if(t > end - transition) opacity = (end - t) / transition
    if(t < start + transition) opacity = (t - start) / transition

    const stamp = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`

    return { time, left, opacity, stamp }
  }

  $: {
    const setLength = Math.floor(range / interval)
    const first = Math.ceil(start / interval) * interval
    
    let updatedSet = [ getLine(first) ]
    for(let i = 1; i < setLength; i++) {
      const time = first + interval * i
      updatedSet.push(getLine(time))
    }
    set = updatedSet
    // console.log(set)
  }
  // $: console.log(stats)
</script>

<div class='x-grid' bind:this={grid}>
  {#each set as line}
    <div class='line' style='transform: translateX({line.left}px); opacity: {line.opacity}'>
      <div class='stamp'>{line.stamp}</div>
    </div>
  {/each}
</div>

<style>
  .x-grid {
    position: absolute;
    top: 0;
    left: 0;
    height: calc(100% + 0px);
    width: 100%;
    border-left: 1px solid var(--gray);
    border-right: 1px solid var(--gray);
  }
  .line {
    position: absolute;
    bottom: 0;
    width: 0;
    height: 100%;
    border-left: 1px solid var(--gray);
  }
  .stamp {
    position: absolute;
    bottom: -24px;
    left: 0;
    left: -50px;
    width: 100px;
    text-align: center;
    font-weight: 400;
    font-size: 14px;
  }
</style>