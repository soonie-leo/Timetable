// 서버 기본 설정
const hostname = "10.34.9.182";
const port = 7423;

// FrameWork: Express
const express = require("express");
const app = express();

// 변수 설정
const values = require("./values");

// Timetable 알고리즘
const Timetable = require("./timetable");

// MySQL 설정
const mysql = require("mysql");
const con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "intI2017!@",
    database: "intI"
});
con.connect(function(err) {
	if(err) throw err;
});

// Setting Template
app.set('view engine', 'ejs');
app.set('views', './views');

// Crawling Require
const request = require('request'),
      cheerio = require('cheerio');
const iconv = require('iconv-lite');

app.get("/", function(req, res) {
    con.query("SELECT DISTINCT subject, grade FROM timetable", function(err, result, fields) {
        if(err) throw err;
        
        res.render('index', { result: JSON.stringify(result) });
    });
});

app.get("/db/insert", function(req, res) { 
    var group = [];
    var options = {
        url: 'http://sugang.inha.ac.kr/sugang/SU_51001/Lec_Time_Search.aspx',
        method:'POST',
        encoding: null,
        form: {
            '__VIEWSTATE': values.__VIEWSTATE,
            '__VIEWSTATEGENERATOR': values.__VIEWSTATEGENERATOR,
            '__EVENTVALIDATION': values.__EVENTVALIDATION,
            'ddlDept': values.ddlDept
        }
    }

    request(options,  function(error, response, html){
        // Encoding EUC-KR
        var strContents = new Buffer(html);
        var $ = cheerio.load(iconv.decode(strContents, 'EUC-KR').toString());

        var table = $("form div table tbody");
       // 수업 개수만큼 반복한다. 또한 시간 및 장소가 다른 경우를 나누어 생각한다. 슬래시가 들어감을 이용하여 나눈다. 
        for(var i=1;i<=table.find("tr").length;i++) {
            if($("tbody tr:nth-child("+i+") .Center:nth-child(7)").text().indexOf('/')!=-1)  {
                group.push({
                    "sno" : $("tbody tr:nth-child("+i+") .Center:nth-child(1)").text(),
                    "subject" : $("tbody tr:nth-child("+i+") .Center:nth-child(3)").text(),
                    "grade" : $("tbody tr:nth-child("+i+") .Center:nth-child(4)").text() ,
                    "credit" : $("tbody tr:nth-child("+i+") .Center:nth-child(5)").text(),
                    "category" : $("tbody tr:nth-child("+i+") .Center:nth-child(6)").text(),
                    "time" : $("tbody tr:nth-child("+i+") .Center:nth-child(7)").text().split('/')[0].split('(')[0].concat(", ",$("tbody tr:nth-child("+i+") .Center:nth-child(7)").text().split('/')[1].split('(')[0]) ,
                    "place" : $("tbody tr:nth-child("+i+") .Center:nth-child(7)").text().split('/')[0].split('(')[1].slice(0,-2).concat(", ",$("tbody tr:nth-child("+i+") .Center:nth-child(7)").text().split('/')[1].split('(')[1].slice(0,-1)),
                    "name_pf" : $("tbody tr:nth-child("+i+") .Center:nth-child(8)").text()
                });
        
                var query =  con.query('INSERT INTO timetable SET ?',group[i-1] , function (err,result){
                    if(err) throw err;
                    console.log("record inserted");
                });

                if((table.find("tr").length)==i){
                    res.send("DB record inserted!");
                }
            }
            else {
                group.push({
                    "sno" : $("tbody tr:nth-child("+i+") .Center:nth-child(1)").text(),
                    "subject" : $("tbody tr:nth-child("+i+") .Center:nth-child(3)").text(),
                    "grade" : $("tbody tr:nth-child("+i+") .Center:nth-child(4)").text() ,
                    "credit" : $("tbody tr:nth-child("+i+") .Center:nth-child(5)").text(),
                    "category" : $("tbody tr:nth-child("+i+") .Center:nth-child(6)").text(),
                    "time" : $("tbody tr:nth-child("+i+") .Center:nth-child(7)").text().split('(')[0] ,
                    "place" : $("tbody tr:nth-child("+i+") .Center:nth-child(7)").text().split('(')[1].slice(0,-1),
                    "name_pf" : $("tbody tr:nth-child("+i+") .Center:nth-child(8)").text()
                });
        
                var query =  con.query('INSERT INTO timetable SET ?',group[i-1] , function (err,result){
                    if(err) throw err;
                    console.log("record inserted");
                });

                if((table.find("tr").length)==i){
                    res.send("DB record inserted!");
                }
            }
        }
    })
}); 

app.get("/timetable", function(req, res) {
    // 데이터를 저장할 변수
    var data = {};


console.log(req.query);

    // 요청 Parameter를 맞춰 SQL 생성
    var sql = "SELECT * FROM timetable WHERE subject='" + req.query.subject[0] + "'";
    for(var i=1; i<req.query.subject.length; i++) {
        sql += " OR subject='" + req.query.subject[i] + "'";
    }

    // 테이블 생성 요청
    con.query(sql, function(err, result, fields) {
        // 검색된 SQL을 강의별로 묶음
        for(var k in result) {
            var subject = result[k]["subject"];
            var sno = result[k]["sno"].split("-");
            var name_pf = result[k]["name_pf"];
            var place = result[k]["place"];

            // 요일과 시간을 숫자 배열로 변경
            // 공백 제거 후 ","을 기준으로 자름
            var split_time = result[k]["time"].replace( /(\s*)/g, "").split(",");
            var time = [];
            var tmp = [];
            for(var i=0; i<split_time.length; i++) {
                // 요일이 포함되어 있다면 별도 처리
                if(isNaN(split_time[i])) {
                    // 시간 정보가 들어있다면
                    if(tmp.length > 0)  {
                        // 시간 변수에 추가해주고 초기화
                        time.push(tmp);
                        tmp = [];
                    }
                    // 요일을 해당 숫자로 변경해서 추가
                    switch(split_time[i][0]) {
                        case "월": tmp.push(1); break;
                        case "화": tmp.push(2); break;
                        case "수": tmp.push(3); break;
                        case "목": tmp.push(4); break;
                        case "금": tmp.push(5); break;
                    }
                    // 웹 강의 제외
                    if(split_time[i][0] != "셀")
                        // 요일을 제외한 시간 부분을 int로 변환해서 추가
                        tmp.push(parseInt(split_time[i].substring(1)));
                } 
                // 요일이 포함되어 있지 않으면 int로 변환해서 추가
                else {
                    tmp.push(parseInt(split_time[i]));
                }
            }
            // 마지막에 저장된 값 추가
            time.push(tmp);
            
            // 분반 정보 추출
            var d = {
                "class": sno[1],
                "name_pf": name_pf,
                "time": time,
                "place": place
            };

            // 해당 강의가 이미 추가되어 있다면
            if(subject in data) {
                data[subject]["classes"].push(d);
            }
            // 해당 강의가 없다면 새롭게 추가
            else {
                data[subject] = {
                    "subject": subject,
                    "sno": sno[0],
                    "classes": [ d ]
                }
            }
        }

        // 사용하기 편하게 key 부분 제거
        var final_data = [];
        for(var k in data) {
            final_data.push(data[k]);
        }
        
        // 가능 시간표 추출
        var timetable = new Timetable(final_data);
        res.json(timetable.create());
    });
});

const server = app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
