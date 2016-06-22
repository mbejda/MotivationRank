var request = require("request");
var async = require("async");
var cheerio = require("cheerio");
var csvWriter = require('csv-write-stream');
var fs = require('fs')

var writer = csvWriter()
writer.pipe(fs.createWriteStream('test.csv'))


var lakeMary = "http://www.zillow.com/search/GetResults.htm?spt=homes&status=110001&lt=111101&ht=111111&pr=,&mp=,&bd=0%2C&ba=0%2C&sf=,&lot=,&yr=,&pho=0&pets=0&parking=0&laundry=0&income-restricted=0&pnd=0&red=0&zso=0&days=12m&ds=all&pmf=1&pf=1&zoom=9&rect=[COORDINATES]&p=1&sort=days&search=map&disp=1&rid=[TARGETREGIONID]&rt=6&listright=true&photoCardsEnabled=true&isMapSearch=true&zoom=9";
var propertyUrl = "http://www.zillow.com/homedetails/116-E-Greentree-Ln-Lake-Mary-FL-32746/[PID]_zpid";
var rectangle = "http://www.zillow.com/homes/[ZIPCODE]_rb/";



var getRectangle = function(url,cb){


console.log("COORDINTES URL",url)
    request(url, function (error, response, body) {
        if (error || !response.statusCode == 200) return cb("error");

        var save = {}

        var $ = cheerio.load(body);
        var href = $('meta[href*="android"]').first().attr('href');

        var text = $(".google-ad-config").first().text();
        var conf=  JSON.parse(text);

       var hrefArr =  href.split("/");
var coord = hrefArr[hrefArr.length - 2];
        coord = coord.replace(/\./g,"").replace("_rect","");
        coords = coord.split(",");
        var coords = coords.reverse();
        console.log("HERE ",coords)


        save['coordinates'] = coords.join(",");
        save['targetRegionId'] = conf.targets.targetRegionId;


        cb(null,save);

    });
};


var getProperty = function(url,cb){
    request(url, function (error, response, body) {
        if (error || !response.statusCode == 200) return cb("error");


        var $ = cheerio.load(body);
        var text = $(".google-ad-config").first().text();
        var data = JSON.parse(text);
        var save = {
            z : parseInt(data.targets.zestimate),
            v :parseInt(data.targets.price)
        };

        cb(null,save);

    });
};
/*
them
http://www.zillow.com/search/GetResults.htm?spt=homes&status=110001&lt=111101&ht=111111&pr=,&mp=,&bd=0%2C&ba=0%2C&sf=,&lot=,&yr=,&pho=0&pets=0&parking=0&laundry=0&income-restricted=0&pnd=0&red=0&zso=0&days=12m&ds=all&pmf=1&pf=1&zoom=12&rect=-81458559,28753062,-81292391,28784511&p=1&sort=days&search=maplist&disp=1&rid=72186&rt=7&listright=true&photoCardsEnabled=true&isMapSearch=true&zoom=12me
http://www.zillow.com/search/GetResults.htm?spt=homes&status=110001&lt=111101&ht=111111&pr=,&mp=,&bd=0%2C&ba=0%2C&sf=,&lot=,&yr=,&pho=0&pets=0&parking=0&laundry=0&income-restricted=0&pnd=0&red=0&zso=0&days=12m&ds=all&pmf=1&pf=1&zoom=9&rect=-81453492,28726195,-81297571,28811285&p=1&sort=days&search=map&disp=1&rid=72186&rt=6&listright=true&photoCardsEnabled=true&isMapSearch=true&zoom=9
 */

var rectUrl = rectangle.replace("[ZIPCODE]","32746");



getRectangle(rectUrl,function(error,conf) {
    console.log("CONF ",conf);


    propertiesUrl = lakeMary.replace("[TARGETREGIONID]",conf.targetRegionId).replace("[COORDINATES]",conf.coordinates);
    console.log(propertiesUrl)

request(propertiesUrl,{type:"json"}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var p = JSON.parse(body);




        async.eachLimit(p.map.properties,2,function(property,next){
            var pid = property[0];
            var url = propertyUrl.replace("[PID]",pid);


            getProperty(url,function(error,conf){

                if(conf.v > 1000) {
                    writer.write(conf);

                }

                console.log(conf);
                next();
            })

        },function(done){
            writer.end()
        });


    }
});
});