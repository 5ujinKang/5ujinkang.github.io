(function($) {
    $.fn.simpleJekyllSearch = function(options) {
        var settings = $.extend({
            jsonFile        : '/search.json',
            jsonFormat      : 'title,tags,categories,url,date,content',
            template : '<li><article><a href="{url}"><span class="entry-category">{categories}</span> {title} <span class="entry-date"><time datetime="{date}">{date}</time></span></a><p class="search-snippet">{snippet}</p></article></li>',
            searchResults   : '.search-results',
            limit           : '10',
            noResults       : '<p>Oh no! We didn\'t find anything :(</p>'
        }, options);

        var properties = settings.jsonFormat.split(',');

        var jsonData = [],
            origThis = this,
            searchResults = $(settings.searchResults);

        if(settings.jsonFile.length && searchResults.length){
            $.ajax({
                type: "GET",
                url: settings.jsonFile,
                dataType: 'json',
                success: function(data, textStatus, jqXHR) {
                    jsonData = data;
                    registerEvent();
                },
                error: function(x,y,z) {
                    console.log("***ERROR in simpleJekyllSearch.js***");
                    console.log(x);
                    console.log(y);
                    console.log(z);
                }
            });
        }

        function registerEvent(){
            origThis.keyup(function(e){
                if($(this).val().length){
                    writeMatches(performSearch($(this).val()), $(this).val());
                }else{
                    clearSearchResults();
                }
            });
        }

        function performSearch(str){
            var matches = [];
            $.each(jsonData,function(i,entry){
                for(var i=0;i<properties.length;i++)
                    if(entry[properties[i]] !== undefined && entry[properties[i]].toLowerCase().indexOf(str.toLowerCase()) !== -1){
                        matches.push(entry);
                        i=properties.length;
                    }
            });
            return matches;
        }

        function getSnippet(content, str) {
            var radius = 80;
            if (!content) return '';
            var idx = content.toLowerCase().indexOf(str.toLowerCase());
            if (idx === -1) return content.substring(0, radius * 2) + '...';
            var start = Math.max(0, idx - radius);
            var end = Math.min(content.length, idx + str.length + radius);
            var snippet = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
            var escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return snippet.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
        }

        function writeMatches(m, str) {
            clearSearchResults();
            searchResults.append($(settings.searchResultsTitle));

            if (m.length) {
                $.each(m,function(i,entry){
                    if(i<settings.limit){
                        var output = settings.template;
                        var snippet = getSnippet(entry['content'], str);
                        for(var i=0;i<properties.length;i++){
                            var regex = new RegExp("\{" + properties[i] + "\}", 'g');
                            output = output.replace(regex, entry[properties[i]]);
                        }
                        output = output.replace(/\{snippet\}/g, snippet);
                        searchResults.append($(output));
                    }
                });
            }else{
                searchResults.append(settings.noResults);
            }
        }

        function clearSearchResults(){
            searchResults.children().remove();
        }
    }
}(Zepto));
