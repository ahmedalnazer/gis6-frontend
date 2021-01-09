<script>
    import Card from "@smui/card";
    import CheckCircle from "./../style/images/CheckCircle.svelte";
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

<Card>
    <div class="sectionHeader">
        <!-- <div style="padding-top:5px; float: left;">
            <CheckCircle size="1.5em" />
        </div> -->
        <div style="margin-left: 3px; padding-top:5px;">Order</div>
    </div>
    <div class="zoneContainer">
        <div class="zoneInfo">Modified 10/08/2020 12:45 PM</div>
        <div>
            <div style="float:left; padding:10px;">
                <div>
                    <span style="font-size: 2em;">27</span> of 150
                </div>
            </div>
            <div style="float:left; padding:10px;">
                <div>
                    <span style="font-size: 2em;">3</span>
                </div>
            </div>
            <div style="float:left; padding:10px;">
                <div>
                    <span style="font-size: 2em;">5.4</span>
                </div>
            </div>
        </div>
    </div>
</Card>