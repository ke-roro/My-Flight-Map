//目的地への角度計算
function getAngle(start, end) {
    const dy = end[0] - start[0]; //緯度の差
    const dx = end[1] - start[1];//経度の差
    return Math.atan2(dy, dx) * (180 / Math.PI) * -1 + 0;
}


// 2. 地図を初期化する（'map'というIDの箱に表示）
// setView([緯度, 経度], ズームレベル) 
const map = L.map('map').setView([34.397, 132.475], 5); 

// 3. 地図のデザイン（タイル）を読み込んで表示する
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);



//出発地(origin)からの目的地（destination)を書く関数
function drawFlightLine(origin, destination, label, layer, originLabel, imgData, flightIndex){
    const route = [origin, destination];
    L.circleMarker(origin,{
    radius: 10,
    fillColor: "Green",
    color: "white",
    fillOpacity:0.9 
}).addTo(layer).bindPopup(originLabel);
//目的地への角度計算
    const angle = getAngle(origin, destination);
//飛行機アイコンの定義
    const customPlaneIcon = L.divIcon({
    html:`<div style="font-size: 40px; transform: rotate(${angle}deg);">✈</div>`,
    className: 'custom-plane-icon',
    iconSize:[50, 50],
    iconAnchor:[25, 25]
});

//目的地のピン
   const destMarker = L.marker(destination).addTo(layer).bindPopup(label);
//弧を描く
   const geodesic = new L.Geodesic(route,{
        weight:2,
        color:'blue',
        steps:100
    }).addTo(layer);

    const points = geodesic.getLatLngs()[0];

    //動く✈
    const marker = L.Marker.movingMarker(points, 5000, {//5000は５秒かけて飛ぶという意味
        icon: customPlaneIcon,
        autostart: false,
        loop: false
    }).addTo(layer);

    //ボタンを押された１．５秒後にスタート
    setTimeout(() => {
        marker.start();
    }, 1500);

    //ズーム
    marker.on('move', function(e){
        map.panTo(e.latlng,{
            animate: false,
            duration: 0.1
        });
    });

    //目的地に着いたらズームイン
    marker.on('end', function(){
        map.flyTo(destination, 11, {
            duration: 2, //2秒かけて動く
            easeLinearity: 0.25//動きの滑らかさ
        });

        setTimeout(() => {
            loadPhotos(flightIndex, label);
        }, 2200);
    });

}



// スプレッドシート
/*const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSRTqFuGWAcCvkajztI6S8-hHvF84EBaplRkBOA5cGdUKOjPREFmRjZx7wOXhCUm1A5E045OEmiBKIj/pub?output=csv';

async function loadFlightsFromSheet() {
    console.log("📍 システム：スプレッドシートの読み込みを開始します...");

    try {
        const response = await fetch(spreadsheetUrl);
        const csvData = await response.text(); //await データが届くまで待機
        
        // CSVを1行ずつ分解する
        const rows = csvData.split('\n').slice(1); // 1行目（見出し）を飛ばす

        rows.forEach((row, index) => {

            //データを切り分ける
            const columns = row.split(/\t|,/);
             console.log(`📝 【${index}行目】の生データ:`, row);
            console.log(`📊 【${index}行目】の列数: ${columns.length}個`);

            //データの数が足りない行は飛ばす
            if (columns.length >= 5) {
                const origin = [parseFloat(columns[0]), parseFloat(columns[1])];
                const dest = [parseFloat(columns[2]), parseFloat(columns[3])];

                //データが空でもエラーにならないように？や｜｜を使う
                const label = (columns[4] || "").trim();
                const origin_label = (columns[5] || "").trim();
                const rawImgData = columns.slice(6).join(','); // 6番目以降をすべて合体させる
                const imgData = rawImgData.replace(/"|/g, '').trim(); // 全体の前後にある " を消す

                console.log(`📸 【${index}行目】の修正済み写真URL:`, imgData);

                const btn = document.createElement('button');
                btn.innerText = (origin_label + "→" + label);
                document.getElementById('flight-menu').appendChild(btn);

                let isFlying = false;
                let myLayer = L.layerGroup().addTo(map);

                btn.addEventListener('click', () => {
                    if (isFlying){
                        myLayer.clearLayers();
                        isFlying = false;
                        btn.classList.remove('active-btn');

                    }else{
                        const bounds = L.latLngBounds([origin, dest]);//出発地と目的地の「枠」を計算
                        map.flyToBounds(bounds, {
                            padding: [50, 50],
                            duration: 1.5//1.5秒かけて滑らかに移動
                        })
                        drawFlightLine(origin, dest, label, myLayer, origin_label, imgData);
                        isFlying = true;
                        btn.classList.add('active-btn');
                    } 


                });

                

            }
        });

        
        //これがあることで、エラーが起きてもシステム全体はダメにならない。原因を突き止めることができる
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
    }
}

// 実行
loadFlightsFromSheet();*/

//三本線ボタンとサイドバー
const hamburger = document.getElementById('hamburger-btn');
const sidebar = document.getElementById('sidebar');

//ボタンをクリックした時の命令
hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});


//全体に戻るリセットボタン
const resetBtn = document.getElementById('reset-btn');
resetBtn.addEventListener('click', () => {
    map.flyTo([34.397, 132.475], 4, {
        duration: 2
    });
});



//airports.csv読み込み
const airports = {};
async function loadAirports(){

    const loadAirportsCSV = await fetch("airports.csv");
    const loadAirportsData  = await loadAirportsCSV.text();
    const rows = loadAirportsData.split("\n").slice(1);

    rows.forEach(row => {
        const columns = row.split(",");
        const lat = columns[4];
        const lng = columns[5];
        const iata = (columns[13] || "").replace(/"/g, "").trim();
       
        if(iata){
            airports[iata] = {
                code: iata,
                lat: lat,
                lng: lng,
                name: (columns[3] || "").replace(/"/g, "").trim(),
                city: (columns[10] || "").replace(/"/g, "").trim(),
                name_jp: (columns[18] || "").replace(/"/g, "").trim(),
                iso_country:(columns[8] || "").replace(/"/g,"").trim(),
                allInfo: row.toUpperCase()
                };    
        }


        

    });

    loadFlightsFromStorage();
}

loadAirports();

//検索ボックス
let searchMarker;
const search = document.getElementById("search-btn");
const result = document.getElementById("search-result");
//検索ボタン
search.addEventListener('click', () => {
    searchAirport();
    
});

//検索の予測変換
const airportInput = document.getElementById("airport-input");
airportInput.addEventListener("input", () => {
    searchAirport();
})


function searchAirport() {
    result.textContent = ("");
    const keyword = airportInput.value.toUpperCase();
    let foundAirports = [];
    Object.values(airports).forEach(airport => {
        if(keyword && airport.allInfo.includes(keyword)
        
        ){

            foundAirports.push(airport);
        }
    })

    foundAirports.forEach(airport => {
        const li = document.createElement('li');
        li.textContent = airport.name + "/" + airport.city + "/" + airport.name_jp;
        result.appendChild(li);

        li.addEventListener('click', () => {
            const position = [airport.lat, airport.lng];
             if(searchMarker){
                map.removeLayer(searchMarker);
        }
        
         searchMarker = L.marker(position).addTo(map);
         map.flyTo(position,11);
        })
    })

     if(foundAirports.length === 0){
        result.textContent = ("空港が見つかりません")
    };
}


//新規旅行記録追加ボタン
const newFlight = document.getElementById("flight-btn");
 const flightAddition = document.getElementById("flight-addition");
newFlight.addEventListener('click', () => {
    flightAddition.style.display = "block";
    
}) 

//登録の中の閉じるボタン
const flightClose = document.getElementById("flight-close")
flightClose.addEventListener('click', () => {
     flightAddition.style.display = "none";
})

//新規旅行追加内容
const flightAdd = document.getElementById("new-add")
flightAdd.addEventListener('click', () => {
    const from = document.getElementById("airport-from").value;
    const fromIata = document.getElementById("airport-from-iata").value;
    const to = document.getElementById("airport-to").value;
    const toIata = document.getElementById("airport-to-iata").value;
    const date = document.getElementById("flight-date").value;
    const flightNumber = document.getElementById("flight-number").value;

    const newFlightData = {
        from:from, to:to, date:date, flightNumber:flightNumber, fromIata:fromIata, toIata:toIata
    }
        
    const flights = JSON.parse(localStorage.getItem("flights")) || [];

    savePhoto(photoFile.files[0],flights.length);

    flights.push(newFlightData);

    localStorage.setItem("flights", JSON.stringify(flights));

    loadFlightsFromStorage();
})

//ボタン生成
function loadFlightsFromStorage() {
        const flightMenu = document.getElementById("flight-menu");
        flightMenu.textContent = ("");
        const flights = JSON.parse(localStorage.getItem("flights")) || [];
        
            flights.forEach((flight, index) => {
                const flightItem = document.createElement('div');
                const btn = document.createElement('button');
                const deletebtn = document.createElement('button');
                const origin = [parseFloat(airports[flight.fromIata].lat),parseFloat(airports[flight.fromIata].lng)]
                const destination = [parseFloat(airports[flight.toIata].lat),parseFloat(airports[flight.toIata].lng)]

                //btn.innerText = (flight.date + "  " + flight.flightNumber + "\n" + flight.from + "→" + flight.to);
                const flightLogo = flight.flightNumber.slice(0, 2)
                deletebtn.innerHTML = ("×");
                flightItem.appendChild(deletebtn);
                deletebtn.classList.add('delete-btn');
                btn.innerHTML = (flight.date + "  " + "<img src=https://images.kiwi.com/airlines/64/" + flightLogo + ".png>" + flight.flightNumber + "\n" + flight.from + "→" + flight.to);
                flightItem.appendChild(btn);
                document.getElementById('flight-menu').appendChild(flightItem)
                flightItem.classList.add('flight-item');
                let isFlying = false;
                let myLayer = L.layerGroup().addTo(map);

                btn.addEventListener('click', () => {
                if (isFlying){
                    myLayer.clearLayers();
                    isFlying = false;
                    btn.classList.remove('active-btn');

                }else{
                    const bounds = L.latLngBounds([origin, destination]);//出発地と目的地の「枠」を計算
                    map.flyToBounds(bounds, {
                        padding: [50, 50],
                        duration: 1.5//1.5秒かけて滑らかに移動
                    })
                    drawFlightLine(origin,destination,flight.to,myLayer,flight.from, [], index);
                    isFlying = true;
                    btn.classList.add('active-btn');

                
            }       
                    
                })    
                deletebtn.addEventListener('click', () => {
                    myLayer.clearLayers();
                    flights.splice(index,1);
                    localStorage.setItem("flights", JSON.stringify(flights));
                     loadFlightsFromStorage();
                     })
            })
                    
            countryCount();

    }




//出発地の文字入力した時
const fromResult = document.getElementById("from-result");
const airportFrom = document.getElementById("airport-from");
const airportFromIata = document.getElementById("airport-from-iata");
airportFrom.addEventListener("input", () => {

    fromResult.textContent = ("");
    const keyword = airportFrom.value.toUpperCase();
    airportFromIata.value = "";
    let foundAirports = [];

    Object.values(airports).forEach(airport => {
        if(keyword && airport.allInfo.includes(keyword)
        ){
            foundAirports.push(airport);
        }
    })


    foundAirports.forEach(airport => {
        const li = document.createElement('li');
        li.textContent = airport.name
        fromResult.appendChild(li);

        li.addEventListener('click', () => {
            airportFrom.value = airport.name;
            airportFromIata.value = airport.code;
            fromResult.style.display = "none";

        })
    })
})

//到着地の文字入力した時
const toResult = document.getElementById("to-result");
const airportTo = document.getElementById("airport-to");
const airportToIata = document.getElementById("airport-to-iata");
airportTo.addEventListener("input", () => {
    toResult.textContent = ("");
    const keyword = airportTo.value.toUpperCase();
    airportToIata.value = "";
    let foundAirports = [];

    Object.values(airports).forEach(airport => {
        if(keyword && airport.allInfo.includes(keyword)
        ){
            foundAirports.push(airport);
        }
    })


    foundAirports.forEach(airport => {
        const li = document.createElement('li');
        li.textContent = airport.name
        toResult.appendChild(li);

        li.addEventListener('click', () => {
            airportTo.value = airport.name;
            airportToIata.value = airport.code;
            toResult.style.display = "none";

        })
    })
})


//flight-number.csv読み込み
const airlines = {};
async function loadAirlines(){

    const loadAirlinesCSV = await fetch("flight-number.csv");
    const loadAirlinesData = await loadAirlinesCSV.text();
    const rows = loadAirlinesData.split("\n").slice(1);

    rows.forEach(row => {
        const columns = row.split(",");
        const airlineCode = (columns[0] || "").replace(/"/g,"").trim();
        const airline = (columns[1] || "").replace(/"/g,"").trim();
        const airlineJapanese = (columns[2] || "").replace(/"/g,"").trim();

        airlines[airlineCode] = {
            airlineCode: airlineCode,
            airline: airline,
            airlineJapanese: airlineJapanese,
            allInfo: row.toUpperCase()
        };

    });
}

loadAirlines();

//便名の文字を入力した時
const numberResult = document.getElementById("number-result");
const flightNumber = document.getElementById("flight-number");
const flightNumberAirlineCode = document.getElementById("flight-number-airlineCode");

flightNumber.addEventListener("input", () => {
    numberResult.textContent = ("");
    const keyword = flightNumber.value.toUpperCase();
    let foundAirlines = [];

    Object.values(airlines).forEach(airline => {
        if(keyword && airline.allInfo.includes(keyword)
        ){
            foundAirlines.push(airline);
        }
    })

    foundAirlines.forEach(airline => {
        const li = document.createElement('li');
        li.textContent = airline.airline + "/" + airline.airlineJapanese
        numberResult.appendChild(li);
        
        li.addEventListener('click', () => {
            flightNumber.value = airline.airlineCode
            flightNumberAirlineCode.value = airline.airlineCode
            numberResult.style.display = "none";
        })
    })
})

//IndexedDB 
const request = indexedDB.open("flightPhotos", 1);
let db;
 
//初回作成時
request.onupgradeneeded = (event) => {
    const db = event.target.result
    const objectStore = db.createObjectStore("photos", { keyPath: "id", autoIncrement: true});
    objectStore.createIndex("flightIndex", "flightIndex", { unique: false});
}

//データベースが正常に開けた場合
request.onsuccess = (event) => {
    db = event.target.result
    
}

//データベースが開けなかった場合
request.onerror = (event) => {
    console.error("エラー",event);
}

//画像ファイルをBase64に変換
function savePhoto(file, index) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result;
            const transaction = db.transaction(["photos"], "readwrite");
            const store = transaction.objectStore("photos");
            store.add({ flightIndex: index, photo: base64});
        }
}

const photoFile = document.getElementById('photo-file');
photoFile.addEventListener("change", () => {
    
})

//写真の読み込み
function loadPhotos(flightIndex,label) {
    const transaction = db.transaction(["photos"], "readonly")
    const store = transaction.objectStore("photos");
    const index = store.index("flightIndex");
    const getRequest = index.getAll(flightIndex);

        getRequest.onsuccess = () => {
            const photos = getRequest.result;
            const images = photos.map(p => p.photo)
            const overlay = document.getElementById('photo-overlay');
            const gallery = document.getElementById('photo-gallery');
            const title = document.getElementById('photo-title');

            //中身をセット
            gallery.innerHTML = ' '; //前に開いた時の写真を一度消して空に
            title.innerText = label;

            //写真の枚数によって表示を変える
            if (images.length === 0) {
                return;
            } else if (images.length === 1) {
                //写真が１枚だけの時は矢印を表示しない
                gallery.innerHTML = `<img src="${images[0]}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">`;
            } else {
                //写真が複数ある時はスライドショーを作る
                let currentIndex = 0; //今「何枚目」を見ているか記憶

                //HTMLに画像と矢印の枠組みを作り出す
                gallery.innerHTML = `
                <div style="position: relative; display: inline-block; max-width: 100%;">
                    <button id="prev-btn" class="nav-btn">&#10094;</button> <img id="carousel-img" src="${images[0]}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">
                    <button id="next-btn" class="nav-btn">&#10095;</button> </div>
                <p id="photo-counter" style="margin-top: 10px; font-size: 0.9rem;">1 / ${images.length}</p>
                `;

                const prevBtn = document.getElementById('prev-btn');
                const nextBtn = document.getElementById('next-btn');
                const carouselImg = document.getElementById('carousel-img');
                const counter = document.getElementById('photo-counter');

                //画面と矢印の表示を更新する関数
                const updateCarousel = () => {
                    carouselImg.src = images[currentIndex];
                    counter.innerText = `${currentIndex + 1} / ${images.length}`; //画像を入れ替える

                    //１枚目の時は左矢印を隠す、最後の時は右矢印を隠す
                    prevBtn.style.display = currentIndex === 0 ? 'none' : 'block';
                    nextBtn.style.display = currentIndex === images.length -1 ? 'none' : 'block';
                };

                updateCarousel(); //最初に１回実行して見た目を整える

                //左矢印を押したときの動作
                prevBtn.onclick = () => {
                    if (currentIndex > 0) {
                        currentIndex--;//番号を一つ減らす
                        updateCarousel();
                    }
                };

                //右矢印を押した時の動作
                nextBtn.onclick = () => {
                    if (currentIndex < images.length - 1) {
                        currentIndex++;//番号を増やす
                        updateCarousel();
                    }
                };
            }

            //幕を開く
            overlay.classList.remove('hidden'); //CSSの隠すしるしを取り除く

            //閉じるボタンを使えるように
            document.getElementById('close-overlay').onclick = () => {
                overlay.classList.add('hidden'); //また「隠す」しるしを
            } ;
        }
}

//訪れた国カウント
function countryCount() {
    const countries = new Set();
    const flights = JSON.parse(localStorage.getItem("flights")) || [];
    const countrycount = document.getElementById('country_count');
        flights.forEach(flight => {
            countries.add(airports[flight.fromIata].iso_country);
            countries.add(airports[flight.toIata].iso_country);
})
    countrycount.textContent = countries.size;
}
