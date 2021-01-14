<script>
    import { fade, slide, scale } from "svelte/transition";
    import { createEventDispatcher } from "svelte";
    const dispatchSetupProduction = createEventDispatcher();
    let showSplashScreen = false;

    setTimeout(function () {
        showSplashScreen = false;
        dispatchSetupProduction("splashScreen", { showSplashScreen });
    }, 3000);
</script>

<style lang="scss">
    .splash-container {
        background-color: #000000;
        color: #ffffff;
        text-align: center;
        padding: 5px;
        height: 100%;
        font-family: Arial, Helvetica, sans-serif;
    }

    .splash-header {
        padding: 10px;
        height: 10%;
    }

    .splash-header-content {
        font-size: 26px;
    }

    .splash-title {
        font-size: 56px;
        padding: 20px;
        letter-spacing: 0.06em;
    }

    .splash-logo-container {
        // min-height: 300px;
        padding: 40px;
        text-align: center;
        height: 85%;
    }

    .splash-logo-container img {
        vertical-align: middle;
        display: table-cell;
        background-position: center center;
        top: 35%;
        position: relative;
    }

    .splash-footer {
        height: 10%;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        color: white;
        text-align: center;
    }

    .splash-footer-content {
        font-size: 1em;
        letter-spacing: 1px;
        text-align: center;
        width: 100%;
        color: #828282;
    }

    .splash-body {
        display: block;
        justify-content: center;
        align-items: center;
        text-align: center;
        height: 80%;
    }

    .splash-body-content {
        display: inline-block;
        vertical-align: middle;
        height: 100%;
        padding-top: 40px;
    }

    .center {
        display: block;
        margin-left: auto;
        margin-right: auto;
        width: 50%;
    }

    .splash-img {
        display: block;
        width: 200px;
        animation-name: spin;
        animation-duration: 2000ms;
        transition: transform 1s;
        text-align: center;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg) translateZ(0);
            width: 200px;
        }
        50% {
            transform: rotate(360deg) translateZ(0);
            width: 1px;
        }
        100% {
            transform: rotate(0deg) translateZ(0);
            width: 200px;
        }
    }
</style>

<div class="splash-container">
    <div class="splash-header">
        <div class="splash-header-content" style="float:left;">GIS-6</div>
        <div class="splash-header-content" style="float:right;">
            Version 1.0
        </div>
    </div>

    <div class="splash-body">
        <div class="splash-body-content">
            <div class="splash-title"><span>Barnes Group, Inc</span></div>
            <div class="splash-logo-container">
                <img
                    class="splash-img center"
                    src="/images/bg_logo1.png"
                    alt="Barnes Logo" />
            </div>
        </div>
    </div>

    <div class="splash-footer">
        <div class="splash-footer-content">
            We are an agile and result-driven team aligned on our mission and we
            win together
        </div>
    </div>
</div>
