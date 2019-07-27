$(document).ready(function(){
    var allFactions, allUnits, allUpgrades;
    var selectedFaction;
    var army=[];
    var totalPoints = 0;

    var maxPoints = 800;
    var allowedQtds;


    // carrega dados de facção em json
    $.ajax({
        url:'data/factions.json',
        dataType:'json',
        complete: function(x,r){
            allFactions = x.responseJSON;
            // carrega combo de facções
            $('#select-faction')
                .find('option')
                .remove()
                .end()
                .append('<option value="" default=1>Escolha sua facção...</option>')
                .val('');
            $(allFactions).each(function(k,v){
                $('#select-faction').append($('<option />').val(v.name).text(v.description));
            });


        }
    });

    // carrega faixas de minimo/maximo
    $.ajax({
        url:'data/ranges.json',
        dataType:'json',
        complete: function(x,r){
            allowedQtds = x.responseJSON;
            for( var rank in allowedQtds ) {
                $('#'+rank+'-range').html("["+allowedQtds[rank].min+"-"+allowedQtds[rank].max+"]");
            }
        }
    });

    // carrega dados de unidades em json
    $.ajax({
        url:'data/units.json',
        dataType:'json',
        complete: function(x,r){
            allUnits = x.responseJSON;
        }
    });

    // carrega dados de upgrades em json
    $.ajax({
        url:'data/upgrades.json',
        dataType:'json',
        complete: function(x,r){
            allUpgrades = x.responseJSON;
        }
    });


    // ao escolher uma facção, trava o botão e popula o combo de unidades
    $('#select-faction').on('change',function(e){
        $('#select-faction').prop('disabled',true);
        selectedFaction = $('#select-faction').val();

        $('#units').hide();

        var unitsByRank={};
        $(allUnits).each(function(k,v){
            if ( v.faction == selectedFaction || v.faction == 'Neutral' ) {
                var display_name = getUnitTitle(v);
                console.log(v.rank);
                if ( !unitsByRank[ v.rank ] ) {
                    unitsByRank[ v.rank ] = []
                }
                unitsByRank[ v.rank ].push( {'id':k,'name':display_name} ); 
                //html += "<li class='list-group-item add-unit' unit-id='"+k+"'>" + v.rank + " - "+display_name + "</li>";
            }
        });

        var html = "<ul class='list-group'>";
        $(['commander','corps','heavy','operative','special_forces','support']).each(function(k,rank){
            var img = "<img src='icons/"+rank+".png'/>";
            $(unitsByRank[rank]).each(function(k2,v2){
                html += "<li class='list-group-item add-unit-item' unit-id='"+v2.id+"'>"+img+" "+v2.name+"</li>"
            });
        });
        html += "</ul>";
        $('#units').html(html);

        $('.add-unit-item').on('click',addUnitToArmy);

    })

    // ao escolher uma unidade, exibe combo de unidades e esconde exército
    $('#add-unit-button').on('click',function(e){
        $('#units').show();
        $('#army').hide();
    });

    // verifica se a unidade unit pode ser adicionada ao exército em edição
    CanAddUnitToArmy = new (function() {
        this.error = "";
        this.validate = function(unit) {
            if ( unit.unique && findUnitInArmyByName( unit.name ) ) {
                this.error="Já existe um "+unit.name+" no exército, e esta é uma unidade única";
                return false;
            }
        
            return true;
        }
    })()

    // adiciona uma unidade (indicada no elemento que disparou o
    // evento e) ao exército, se possível.
    addUnitToArmy = function(e){
        // codigo a rodar quando escolhe uma unidade
        var unit_id = $(e.currentTarget).attr('unit-id');
        var unit = allUnits[unit_id];
        if ( !unit ) { throw "Não achei essa unidade! Eita."; }
        if ( !CanAddUnitToArmy.validate(unit) ) {
            alert( CanAddUnitToArmy.error );
            return;
        } else {
            var newUnit = cloneObject( unit );
            // TODO testar se é unidade unica, e se já existe
            // este array contem os upgrades equipados.
            newUnit.equipped_upgrades = []
            army.push(newUnit);
            renderArmy();
        }
        $('#units').hide();
        $('#army').show();
    };

    // pendura um evento onclick para todos os links de upgrade
    hookEventsForUpgradesLinks = function() {    
        // ao escolher um upgrade, permite escolher uma carta desse tipo
        $('.upgrade').on('click',function(e){
            var army_index = $(e.target).attr('army-index');
            var upgrade_index = $(e.target).attr('upgrade-index');
            selectUpgrade( army_index, upgrade_index, army[army_index].upgrade_type[upgrade_index], army[army_index].unit_type );
        });
    }

    // pendura eventos para remover unidades
    hookEventsForRemoveUnit = function() {
        $('.remove-unit').on('click',function(e){
            var army_index = $(e.target).attr('army-index');
            army.splice(army_index,1);
            renderArmy();
        });
    }

    hookEventsForCopyUnit = function() {
        $('.copy-unit').on('click', function(e){
            var army_index = $(e.target).attr('army-index');
            var new_unit = cloneObject( army[army_index] );
            new_unit.equipped_upgrades = cloneObject( new_unit.equipped_upgrades );
            army.push(new_unit);
            renderArmy();
        });
    }

    // pendura um evento onclick para todos os links de upgrade
    hookEventsForUpgradeCards = function(army_index, upgrade_index) {    
        // ao escolher um upgrade, permite escolher uma carta desse tipo
        $('.upgrade-card').on('click',function(e){
            var upgrade_card_index = $(e.currentTarget).attr('upgrade-card-index');
            equipUpgrade( army_index, upgrade_index, upgrade_card_index );
            hideUpgrades();
            renderArmy();
            showArmy();
        });
    }

    // exibe a tela de seleção de upgrade 
    selectUpgrade = function( army_index, upgrade_index, upgrade_type,  unit_type ) {
        console.log("clicou no upgrade "+upgrade_type+" da unidade "+army[army_index].name + " tipo " + unit_type);
        hideArmy();
        showUpgrades(upgrade_type,  unit_type);
        hookEventsForUpgradeCards(army_index, upgrade_index);
    }

    // insere o upgrade especificado na nave
    equipUpgrade = function( army_index, upgrade_index, upgrade_card_index ){
        console.log( "equipando carta '"+upgrade_card_index+"' na unidade "+army_index+" slot "+upgrade_index );
        console.log( allUpgrades[upgrade_card_index] );
        army[army_index].equipped_upgrades[upgrade_index] = allUpgrades[upgrade_card_index];
    }
            
    // retorna um título padrão para a unidade
    getUnitTitle = function(unit) {
        return (unit.unique?".":"" ) + unit.name + " (" + unit.cost+")";
    }

    // retorna um subtítulo padrão para a unidade
    getUnitSubTitle = function(unit) {
        return unit.unit_type + " - " + unit.rank; // todo format
    }

    // retorna o título padrão para upgrade
    getUpgradeTitle = function( upgrade ) {
        return upgrade.name + " (" + upgrade.cost + ")"
    }

    // retorna o subtítulo padrão para upgrade
    getUpgradeSubTitle = function( upgrade ) {
        return upgrade.keyword.join("<br/>");
    }

    // imprime exército
    renderArmy = function() {
        var html="";
        totalPoints = 0;
        totalUnitsByRank =  { "commander": 0, "corps": 0, "heavy": 0, "operative": 0, "special_forces": 0, "support": 0 }

        $(army).each(function(k,v){
            var card_title = getUnitTitle(v);
            var card_subtitle = getUnitSubTitle(v);
            html += "<span class='card' style='width: 18em' army-index='"+k+"'>";
            html += "<div class='card-header'>" + card_title;
            if ( ! v.unique ) {
                html += "<button type='button' class='btn btn-primary copy-unit' army-index='"+k+"'>C</button>"
            }
            html += "<button type='button' class='btn btn-danger remove-unit' army-index='"+k+"'>X</button>"
            html += "</div>";
            html += "<div class='card-body'>"
            // <img class="card-img-top" src="..." alt="Card image cap">
            html += "<h6 class='card-subtitle mb-2 text-muted'>"+ card_subtitle + "</h6>"
            html += "<p class='card-text'>"+v.card_text+"</p>";
            $(v.upgrade_type).each(function(k2,v2){
                if ( v.equipped_upgrades[k2] ) {
                    html += "<a class='btn btn-primary upgrade' army-index='"+k+"' upgrade-index='"+k2+"'>" + getUpgradeTitle(v.equipped_upgrades[k2]) + "</a>" // TODO format
                    totalPoints += v.equipped_upgrades[k2].cost
                } else {
                    html += "<a class='btn btn-muted upgrade' army-index='"+k+"' upgrade-index='"+k2+"'>" + v2 + "</a>" // TODO format
                }
            });
            html += "</div></span>";
            totalPoints += v.cost;
            totalUnitsByRank[v.rank]++;
        });
        $('#army').html(html);
        $('#army-total-cost').html(totalPoints + "/" + maxPoints);
        for (var r in totalUnitsByRank){
            $('#'+r+'-qtd').html(totalUnitsByRank[r]);

            if ( totalUnitsByRank[r] < allowedQtds[r].min || totalUnitsByRank[r] > allowedQtds[r].max ) {
                $('#'+r+'-qtd').addClass('text-danger');
            } else {
                $('#'+r+'-qtd').addClass('text-dark');
            }

        };
        hookEventsForUpgradesLinks();
        hookEventsForRemoveUnit();
        hookEventsForCopyUnit();
    };

    // esconde dados do exercito
    hideArmy = function(){
        $('#army').hide()
    }

    // mostra dados do exercito
    showArmy = function(){
        $('#army').show()
    }

    // mostra lista de upgrades para equipar na unidade
    showUpgrades = function(upgrade_type,unit_type) {
        var html="";
        $(allUpgrades).each(function(k,v){
            if ( v.upgrade_type == upgrade_type ) {
                if ( ( v.faction == selectedFaction || v.faction == 'neutral' ) && ( v.unit_type == 'none' || v.unit_type == unit_type ) ) {
                    console.log( k + " - " + v.name );
                    html += "<span class='card upgrade-card' style='width: 18em' upgrade-card-index='"+k+"'>";
                    html += "<h5 class='card-title'>" + getUpgradeTitle(v) + "</h5>";
                    html += "<h6 class='card-subtitle mb-2 text-muted'>" + getUpgradeSubTitle(v) + "</h6>";
                    html += "</span>";
                }
            }
        });
        html += "<span class='card upgrade-card' style='width: 18em' upgrade-card-index=''>";
        html += "* Desequipar *";
        html += "</span>";
        $('#upgrades').html(html);
        $('#upgrades').show();
    }

    hideUpgrades = function() {
        $('#upgrades').hide();
    }

    // busca dados da unidade por nome
    getUnitDataByName = function(name) {
        var returnValue = null;
        $(allUnits).each(function(k,v){
            if ( v.name == name ) {
                returnValue = v;
            }
        });
        return returnValue;
    }

    findUnitInArmyByName = function(name) {
        var returnValue = false;
        $(army).each(function(k,v){
            if ( v.name == name ) {
                returnValue = true;
            }
        });
        return returnValue;
    }

    // clona um objeto simples
    cloneObject = function(obj) {
        return jQuery.extend({}, obj);
    }

});
