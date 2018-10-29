'use strict';

var AOISpeciesProtectionWidget = function (bapConfig, bap) {

    let that = this;

    let chartData = {}
    var currentSpeciesTaxaType = 'all';
    var currentSpeciesData;
    var speciesTitleMap = {
        'a': 'Amphibians',
        'b': 'Birds',
        'm': 'Mammals',
        'r': 'Reptiles',
        'all': 'Species'
    };
    let Specieslayer = []


    const numberWithCommas = (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    this.getHtml = function () {

        return `<div id='${bap.id + 'Chart'}'></div>`
    };

    this.turnOffSpecies = function(){
        if (Specieslayer.length) {
            $(`#${bap.id}Chart .species-layer-raido`).prop('checked', false);
            Specieslayer[0].mapLayer.leafletLayer.setParams({ CQL_FILTER: `SppCode='none'` })
        }
    }

    this.initializeWidget = function () {

        // enable or disable the raster raido buttons based on analysis input
        Specieslayer = bioScape.getAllLayers(false).filter(layer => { return layer.title == "Species Range" })
        if (Specieslayer.length) {
            let Spplayer = Specieslayer[0]
            $(`#${bap.id}BAP #toggleLayer${Spplayer.id}`).click(function () {
                if (!($(`#${bap.id}BAP #toggleLayer${Spplayer.id}`)[0] || {}).checked) {
                   that.turnOffSpecies()
                }
            })
        }

        const poi = actionHandlerHelper.getSearhActionHandler().getPOI()

        if (poi && poi.selectedId) {
            const placeName = poi.selectedName
            this.getSpeciesProtection(poi.selectedId)
                .then(function (data) {
                    chartData = data
                    currentSpeciesData = data.species.all
                    that.bap.rawJson = chartData

                    var viewData = {
                        speciesType: speciesTitleMap[currentSpeciesTaxaType],
                        totalSpecies: chartData.species.all.length,
                        totalAmphibians: chartData.species.amphibian_species.length,
                        totalBirds: chartData.species.bird_species.length,
                        totalMammals: chartData.species.mammal_species.length,
                        totalReptiles: chartData.species.reptile_species.length,
                        species: chartData.species.all
                    };
                    var helpers = { format: escapeSingleQuotesInString };
                    let html = getHtmlFromJsRenderTemplate('#speciesProtectionInfoTemplate', viewData, helpers);
                    $(`#${bap.id}Chart`).append(html)
                    $(`#${bap.id}Chart`).find('#speciesBAPSubtitle').html(`Protection Status of Species in ${placeName}`)

                    initializeSpeciesCharts(chartData);
                    $("input[name='taxaType']").on('change', function () {
                        currentSpeciesTaxaType = this.value;
                        currentSpeciesData = getSpeciesListForTaxaType();
                        resetSpeciesTable();
                        updateSpeciesCharts();
                        that.turnOffSpecies()

                    });
                    $("#resetSpeciesTable").on('click', function () {
                        resetSpeciesTable();
                        that.turnOffSpecies()

                    });
                    $("#spNameCheckbox").on('click', function () {
                        toggleSpeciesName(this);
                    });

                    that.togglePriority(bap.priority)
                })
        }
        else {
            $(`#${bap.id}BapCase`).hide()
        }
    };

    this.getPdfLayout = function () {
        var spRows = $('#spTable tbody').children();
        var spBody = this.getTableBody(spRows);
        return {
            content: [
                { text: $('#speciesBAPSubtitle').text(), style: ['bapContent', 'subtitle'], pageBreak: 'before' },
                {
                    alignment: 'center',
                    columns: [
                        {
                            text: ''
                        },
                        {
                            width: 150,
                            image: sp12chart.div.id
                        },
                        {
                            text: ''
                        },
                        {
                            width: 150,
                            image: sp123chart.div.id
                        },
                        {
                            text: ''
                        }
                    ]
                },
                { text: $('#speciesTableTitle').text(), style: 'bapContent', margin: [0, 15, 0, 5], bold: true, alignment: 'center' },
                {
                    style: 'tableStyle',
                    table: {
                        headerRows: 1,
                        body: spBody
                    }
                }
            ],
            charts: [sp12chart, sp123chart]
        }
    };



    this.getSpeciesProtection = function (place) {

        let chunk = {
            status_1_2: [
                { color: '#660000', count: 0, name: '< 1%', percent: 0.0},
                { color: '#FF0000', count: 0, name: '1 - 10%', percent: 0.0},
                { color: '#EDCB62', count: 0, name: '10 - 17%', percent: 0.0},
                { color: '#9CCB19', count: 0, name: '17 - 50%', percent: 0.0},
                { color: '#228B22', count: 0, name: '> 50%', percent: 0.0},
            ],
            status_1_2_3: [
                { color: '#660000', count: 0, name: '< 1%', percent: 0.0},
                { color: '#FF0000', count: 0, name: '1 - 10%', percent: 0.0},
                { color: '#EDCB62', count: 0, name: '10 - 17%', percent: 0.0},
                { color: '#9CCB19', count: 0, name: '17 - 50%', percent: 0.0},
                { color: '#228B22', count: 0, name: '> 50%', percent: 0.0},
            ],
            species: {
                all: [],
                amphibian_species: [],
                bird_species: [],
                mammal_species: [],
                reptile_species: []
            }
        }


        let url = this.bap.config.charts[0].apiEndpoint + place

        return $.getJSON(url).then(function (searchResult) {
            if (!searchResult.success) {
                $(`#${bap.id}BapCase`).hide()
            }
            else if (searchResult.result.length) {
                searchResult.result.forEach(row => {

                    let c = {
                        common_name: row.spp_comname ? row.spp_comname : "",
                        scientific_name: row.spp_sciname ? row.spp_sciname : "",
                        status_1_2: row.gapstat12perc,
                        status_1_2_3: row.gapstat123perc,
                        taxaletter: row.taxa,
                        sppcode: row.sppcode
                    }
                    chunk.species.all.push(c)
                    if (c.taxaletter == 'A') chunk.species.amphibian_species.push(c)
                    if (c.taxaletter == 'B') chunk.species.bird_species.push(c)
                    if (c.taxaletter == 'M') chunk.species.mammal_species.push(c)
                    if (c.taxaletter == 'R') chunk.species.reptile_species.push(c)

                    let total = searchResult.result.length

                    if (row.gapstat12group == '<1') chunk.status_1_2[0].count += 1
                    else if (row.gapstat12group == '1-10') chunk.status_1_2[1].count += 1
                    else if (row.gapstat12group == '1-17') chunk.status_1_2[2].count += 1
                    else if (row.gapstat12group == '17-50') chunk.status_1_2[3].count += 1
                    else if (row.gapstat12group == '>50') chunk.status_1_2[4].count += 1

                    if (row.gapstat123group == '<1') chunk.status_1_2_3[0].count += 1
                    else if (row.gapstat123group == '1-10') chunk.status_1_2_3[1].count += 1
                    else if (row.gapstat123group == '1-17') chunk.status_1_2_3[2].count += 1
                    else if (row.gapstat123group == '17-50') chunk.status_1_2_3[3].count += 1
                    else if (row.gapstat123group == '>50') chunk.status_1_2_3[4].count += 1

                    chunk.status_1_2.forEach(x => {
                        x.percent = parseFloat(x.count / total) * 100
                    })
                    chunk.status_1_2_3.forEach(x => {
                        x.percent = parseFloat(x.count / total) * 100
                    })

                })

            }
            else {
                $(`#${bap.id}BapCase`).hide()
                console.log(searchResult)
            }
            return chunk
        })
            .catch(function (err) {
                console.log(err.message);
            });

    }

    /**
     * Create the species GAP status charts.
     */
    var sp12chart, sp123chart;
    function initializeSpeciesCharts(chartData) {
        var balloonText = "<span style='font-size:14px'><b>[[name]]<br>[[count]] species</b></span>";

        var sp12Title = 'GAP Status 1 & 2';
        var sp12ChartData = AmChartsHelper.getChartDataFromJsonArray(chartData.status_1_2, 0, true);
        sp12chart = AmChartsHelper.getAmPieChart(sp12Title, sp12ChartData, balloonText, AmChartsHelper.getAmLegend(), true);
        sp12chart.addListener('clickSlice', function (event) {
            sp12chart.validateData();
            updateSpeciesTable(sp12Title, event.dataItem);
            that.turnOffSpecies()

        });

        var sp123Title = 'GAP Status 1,2 & 3';
        var sp123ChartData = AmChartsHelper.getChartDataFromJsonArray(chartData.status_1_2_3, 0, true);
        sp123chart = AmChartsHelper.getAmPieChart(sp123Title, sp123ChartData, balloonText, AmChartsHelper.getAmLegend(), true);
        sp123chart.addListener('clickSlice', function (event) {
            sp123chart.validateData();
            updateSpeciesTable(sp123Title, event.dataItem);
            that.turnOffSpecies()

        });

        // WRITE
        sp12chart.write("sp12chart");
        sp123chart.write("sp123chart");
    }

    /**
     * Update the species GAP status table.
     * @param {string} chartName - name of the chart calling this method
     * @param {*} dataItem - data used to filter and update the table
     */
    function updateSpeciesTable(chartName, dataItem) {
        $('#spNameCheckbox').attr('checked', false);
        $("#spNameToggle").show();

        var displayString = dataItem.dataContext.name;
        var bounds = getHigherAndLowerBounds(displayString);

        var myList = [];
        var gapStatusProperty = chartName == 'GAP Status 1 & 2' ? 'status_1_2' : 'status_1_2_3';

        for (var i = 0; i < currentSpeciesData.length; i++) {
            var mySp = currentSpeciesData[i];
            var value = mySp[gapStatusProperty];

            if (value >= bounds.lower && value < bounds.higher) {
                myList.push({ common_name: mySp['common_name'], scientific_name: mySp['scientific_name'], percent: value, sppcode: mySp['sppcode'] });
            }
        }

        var sorted = sortByPercent(myList);

        var viewData = {
            species: sorted
        };
        var helpers = { format: formatStatusPercentage, formatName: escapeSingleQuotesInString };
        var html = getHtmlFromJsRenderTemplate('#updateSpeciesProtectionTableTemplate', viewData, helpers);
        $("#spTable").html(html);

        var selected = speciesTitleMap[currentSpeciesTaxaType];

        $('#speciesReset').show();

        var title = myList.length + " " + selected + " with " + displayString + " within " + chartName + " in the Ecoregion";
        updateTableTitle('speciesTableTitle', title, dataItem.color, dataItem.index);
    }

    /**
     * Get the list of species based on currentSpeciesTaxaType.
     * @returns {Array.<*>}
     */
    function getSpeciesListForTaxaType() {
        var lilMapper = {
            'a': 'amphibian_species',
            'b': 'bird_species',
            'm': 'mammal_species',
            'r': 'reptile_species'
        };
        var collectionName = lilMapper[currentSpeciesTaxaType];
        return collectionName ? chartData.species[collectionName] : chartData.species['all'];
    }

    /**
     * Reset the species GAP status table.
     */
    function resetSpeciesTable() {
        $("#spNameToggle").hide();
        $('#speciesReset').hide();

        var viewData = {
            speciesType: speciesTitleMap[currentSpeciesTaxaType],
            species: currentSpeciesData,
        };
        var helpers = { format: escapeSingleQuotesInString };
        var html = getHtmlFromJsRenderTemplate('#speciesTableContainerTemplate', viewData, helpers);
        toggleEcoregionSpeciesLayer("")
        toggleSpeciesHabitatLayer("")
        $("#speciesTableContainer").html(html);
    }

    this.togglePriority = function(priority) {
        if (priority) {
            $(".spProtRadio").show();
        } else {
            highlightRow(null);
            $(".spProtRadio").hide();
        }
    }

    /**
     * Update the species charts with the currentSpeciesData.
     */
    function updateSpeciesCharts() {

        var low = 0, lowMid = 0, mid = 0, highMid = 0, high = 0;
        var low23 = 0, lowMid23 = 0, mid23 = 0, highMid23 = 0, high23 = 0;
        var total = 0;

        for (var j = 0; j < currentSpeciesData.length; j++) {
            if (currentSpeciesData[j]['status_1_2'] < 1) low++;
            else if (currentSpeciesData[j]['status_1_2'] < 10) lowMid++;
            else if (currentSpeciesData[j]['status_1_2'] < 17) mid++;
            else if (currentSpeciesData[j]['status_1_2'] < 50) highMid++;
            else high++;

            if (currentSpeciesData[j]['status_1_2_3'] < 1) low23++;
            else if (currentSpeciesData[j]['status_1_2_3'] < 10) lowMid23++;
            else if (currentSpeciesData[j]['status_1_2_3'] < 17) mid23++;
            else if (currentSpeciesData[j]['status_1_2_3'] < 50) highMid23++;
            else high23++;

            total++;
        }

        var sp12chartData = getChartData(low, lowMid, mid, highMid, high, total);

        var sp123chartData = getChartData(low23, lowMid23, mid23, highMid23, high23, total);

        updateSpeciesChartData(sp12chartData, sp123chartData);
    }

    /**
     * Get data for a pie chart.
     * @param {number} low - number of species in a low GAP protection area
     * @param {number} lowMid - number of species in a low medium GAP protection area
     * @param {number} mid - number of species in a medium GAP protection area
     * @param {number} highMid - number of species in a high medium GAP protection area
     * @param {number} high - number of species in a high GAP protection area
     * @param {number} total - total number of species
     * @returns {Array.<{name: {string}, count: {number}, percent: {number}, color: {string}}>}
     */
    function getChartData(low, lowMid, mid, highMid, high, total) {
        return [
            { name: '< 1%', count: low, percent: low / total * 100, color: '#660000' },
            { name: '1 - 10%', count: lowMid, percent: lowMid / total * 100, color: '#FF0000' },
            { name: '10 - 17%', count: mid, percent: mid / total * 100, color: '#EDCB62' },
            { name: '17 - 50%', count: highMid, percent: highMid / total * 100, color: '#9CCB19' },
            { name: '> 50%', count: high, percent: high / total * 100, color: '#228B22' }
        ];
    }

    /**
     * Update the species charts.
     * @param {Array.<{name: {string}, count: {number}, percent: {number}, color: {string}}>} status12Data - the GAP status 1 & 2 data
     * @param {Array.<{name: {string}, count: {number}, percent: {number}, color: {string}}>} status123Data - the GAP status 1, 2, & 3 data
     */
    function updateSpeciesChartData(status12Data, status123Data) {
        var sp12ChartData = AmChartsHelper.getChartDataFromJsonArray(status12Data, 0, true);
        var sp123ChartData = AmChartsHelper.getChartDataFromJsonArray(status123Data, 0, true);
        AmCharts.charts.forEach(function (chart) {
            if (chart.div.id == 'sp12chart') {
                chart.dataProvider = sp12ChartData;
                chart.validateData();
            } else if (chart.div.id == 'sp123chart') {
                chart.dataProvider = sp123ChartData;
                chart.validateData();
            }
        });
    }

    /**
     * If the scientific names are currently being displayed than switch to common names and vice versa.
     * @param {*} el - the element clicked by the user
     */
    function toggleSpeciesName(el) {
        var title = $("#spLeftColTitle");
        var commonName = $(".spCommonName");
        var sciName = $(".spScientificName");

        if ($(el).is(":checked")) {
            title.text("Scientific Name");
            commonName.removeClass('shownTd').addClass('hiddenTd');
            sciName.removeClass('hiddenTd').addClass('shownTd');
        } else {
            title.text("Common Name");
            sciName.removeClass('shownTd').addClass('hiddenTd');
            commonName.removeClass('hiddenTd').addClass('shownTd');
        }
    }
};

inherit(Widget, AOISpeciesProtectionWidget);