<script>
    import { onMount, beforeUpdate, afterUpdate, onDestroy } from "svelte";
    import Card from "@smui/card";
    import CheckCircle from "./../style/images/CheckCircle.svelte";
    import io from "socket.io-client";
    let hrValue = {};
    let hrHigherZoneTemp = "0";
    let hrLowerZoneTemp = 0;
    let socket = io("http://localhost:8090");
    export let isLayoutView = false;

    onMount(() => {
        socket.on("message", (data) => {
            hrValue = data;
            hrHigherZoneTemp = hrValue.HRHigherZoneTemp;
            hrLowerZoneTemp = hrValue.HRLowerZoneTemp;
        });
    });
</script>

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
        background-color: green;
        color: #ffffff;
        padding: 5px;
    }

    .zoneContainer {
        padding: 8px 8px 13px 8px;
    }

    .layoutView {
        max-height: 130px;
        opacity: 0.4;
        cursor: move;
    }
</style>

{#if isLayoutView}
    <div class="layoutView">
        <Card>
            <div class="sectionHeader">
                <div style="padding-top:5px; float: left;">
                    <CheckCircle size="1.5em" />
                </div>
                <div style="margin-left: 30px; padding-top:5px;">
                    Hot Runner
                </div>
            </div>
        </Card>
    </div>
{:else}
    <Card>
        <div class="sectionHeader">
            <div style="padding-top:5px; float: left;">
                <CheckCircle size="1.5em" />
            </div>
            <div style="margin-left: 30px; padding-top:5px;">Hot Runner</div>
        </div>
        <div class="zoneContainer">
            <div class="center">
                <div>
                    <div class="zoneTemp">{hrHigherZoneTemp} C</div>
                    <div class="zoneInfo">Highest Zone 10</div>
                </div>
                <div>
                    <div class="zoneTemp">{hrLowerZoneTemp} C</div>
                    <div class="zoneInfo">Lowest Zone 5</div>
                </div>
            </div>

            <div class="zoneInfo">Polypropylene | Range 250-270 C</div>
        </div>
    </Card>
{/if}
