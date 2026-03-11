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
function drawFlightLine(origin, destination, label, layer, originLabel, imgData){
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
            //HTMLの要素を捕まえる
            const overlay = document.getElementById('photo-overlay');
            const gallery = document.getElementById('photo-gallery');
            const title = document.getElementById('photo-title');

            //中身をセット
            gallery.innerHTML = ' '; //前に開いた時の写真を一度消して空に
            title.innerText = label;

            //スプレッドシートからのURLをバラバラにして無駄なものをとる
            const rawImages = imgData ? imgData.split(',') : [];
            const images = rawImages.map(url => url.replace(/^"|"$/g, '').trim()).filter(url => url !== "");

            //写真の枚数によって表示を変える
            if (images.length === 0) {
                gallery.innerHTML = '<p>写真がありません</p>';
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
        }, 2200);
    });

}



// スプレッドシート
const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSRTqFuGWAcCvkajztI6S8-hHvF84EBaplRkBOA5cGdUKOjPREFmRjZx7wOXhCUm1A5E045OEmiBKIj/pub?output=csv';

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
loadFlightsFromSheet();

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


const airports = {};

//airports.csv読み込み
async function loadAirports(){

    const loadAirportsCSV = await fetch("airports.csv");
    const loadAirportsData  = await loadAirportsCSV.text();
    const rows = loadAirportsData.split("\n").slice(1);

    rows.forEach(row => {
        const columns = row.split(",");
        const lat = columns[4];
        const lng = columns[5];
         const iata = (columns[13] || "").replace(/"/g, "").trim();
         //console.log(iata);


       
        if(iata){
            airports[iata] = {
                lat: lat,
                lng: lng
                };
            
        }

        

    });

    console.log(airports["KIX"]);

}

loadAirports();

//検索ボックス
const search = document.getElementById("search-btn");
search.addEventListener('click', () => {
    const code = document.getElementById("airport-input").value.toUpperCase();
    const airport = airports[code];
    const position = [airport.lat, airport.lng];
    console.log(position);

    map.flyTo(position,11);
}) 
