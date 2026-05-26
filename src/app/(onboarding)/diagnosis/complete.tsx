// Route: /(onboarding)/diagnosis/complete (S03: 맞춤 동네 결과)
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapHtmlView } from '@/components/MapHtmlView';
import { AppHeader } from '@/components/AppHeader';
import { TabBar } from '@/components/TabBar';
import { useDiagnosisStore, CANDIDATE_HOODS } from '@/store/useDiagnosisStore';
import type { Hood } from '@/store/useDiagnosisStore';

type Tier = Hood['tier'];
const TIER_BG: Record<Tier, string> = { 1: '#0A0A0B', 2: '#059669', 3: '#71717A' };

function scoreCol(score: number): string {
  return score >= 90 ? '#064E3B' : score >= 80 ? '#059669' : score >= 70 ? '#10B981' : '#6EE7B7';
}
function scoreTxt(score: number): string {
  return score < 70 ? '#064E3B' : 'white';
}

/* ─── Building 타입 + 조회 ─── */
const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

type Building = { id: string; name: string; lat: number; lng: number };

async function fetchBuildingsNear(lat: number, lng: number): Promise<Building[]> {
  if (!KAKAO_REST_KEY) return [];
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=아파트&x=${lng}&y=${lat}&radius=1000&size=5&sort=distance`,
      { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      documents: Array<{ id: string; place_name: string; x: string; y: string }>;
    };
    return data.documents.map((d) => ({
      id: d.id,
      name: d.place_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
    }));
  } catch {
    return [];
  }
}

/* ─── Kakao Map HTML ─── */
const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

function buildMapHTML(hoods: Hood[], buildings: Building[]): string {
  const geo = JSON.stringify(
    hoods.map((h) => ({ name: h.name, lat: h.lat, lng: h.lng, score: h.score, tier: h.tier }))
  );
  const bldgs = JSON.stringify(buildings);
  const centerLat = hoods.length > 0 ? hoods.reduce((s, h) => s + h.lat, 0) / hoods.length : 37.552;
  const centerLng = hoods.length > 0 ? hoods.reduce((s, h) => s + h.lng, 0) / hoods.length : 127.035;

  return `<!DOCTYPE html>
<html>
<head>
<base href="https://localhost/">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<script>
(function(){
  var d=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
  var origCreate=document.createElement.bind(document);
  document.createElement=function(tag){
    var el=origCreate(tag);
    if(String(tag).toLowerCase()==='script'){
      Object.defineProperty(el,'src',{
        configurable:true,
        get:function(){return d.get.call(this);},
        set:function(v){
          if(typeof v==='string'){
            if(v.indexOf('http://')===0) v='https://'+v.slice(7);
            else if(v.indexOf('//')===0) v='https:'+v;
          }
          d.set.call(this,v);
        }
      });
    }
    return el;
  };
})();
</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%}
.mk{display:flex;flex-direction:column;align-items:center;cursor:pointer}
.bubble{display:flex;flex-direction:row;align-items:center;gap:4px;padding:5px 10px;border-radius:20px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.2)}
.b-score{font-weight:900;font-family:-apple-system,sans-serif;letter-spacing:-0.5px}
.b-name{font-weight:700;font-family:-apple-system,sans-serif;color:white}
.tail{width:0;height:0;border-style:solid}
.bk{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer}
.bk-dot{width:9px;height:9px;border-radius:5px;background:#2563EB;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.bk-lbl{background:rgba(255,255,255,.92);padding:1px 4px;border-radius:3px;font-size:7px;font-weight:600;color:#1D4ED8;font-family:-apple-system,sans-serif;white-space:nowrap;max-width:68px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 2px rgba(0,0,0,.08)}
@keyframes pop{0%{opacity:0;transform:scale(0.3) translateY(10px)}65%{transform:scale(1.12) translateY(-3px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes fadeup{0%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:translateY(0)}}
#hints{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:10}
.hint{pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;position:absolute;width:40px;height:40px;cursor:pointer}
</style>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"></script>
</head>
<body>
<div id="map"></div>
<div id="hints"></div>
<script>
var GEO=${geo};
var BLDGS=${bldgs};
function tap(n){
  var p=JSON.stringify({type:'tap',name:n});
  if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(p);}
  else if(window.parent){window.parent.postMessage(p,'*');}
}
kakao.maps.load(function(){
    function scoreCol(s){return s>=90?'#064E3B':s>=80?'#059669':s>=70?'#10B981':'#6EE7B7'}
    function scoreTxt(s){return s<70?'#064E3B':'white'}
    var map=new kakao.maps.Map(document.getElementById('map'),{
      center:new kakao.maps.LatLng(${centerLat},${centerLng}),level:6
    });
    BLDGS.forEach(function(b,i){
      var el=document.createElement('div');
      el.className='bk';
      el.style.animation='fadeup 0.3s ease '+(0.6+i*0.04)+'s both';
      el.addEventListener('animationend',function(){this.style.animation='none';});
      el.innerHTML='<div class="bk-dot"></div><div class="bk-lbl">'+b.name+'</div>';
      new kakao.maps.CustomOverlay({
        position:new kakao.maps.LatLng(b.lat,b.lng),
        content:el,xAnchor:.5,yAnchor:1,zIndex:1
      }).setMap(map);
    });
    GEO.sort(function(a,b){return b.score-a.score;}).forEach(function(h,i){
      var fs=h.tier===1?15:13;
      var col=scoreCol(h.score),txt=scoreTxt(h.score);
      var wrap=document.createElement('div');
      wrap.className='mk';
      wrap.style.animation='pop 0.4s cubic-bezier(.34,1.56,.64,1) '+(i*0.15)+'s both';
      wrap.addEventListener('animationend',function(){this.style.animation='none';});
      wrap.onclick=function(){tap(h.name);};
      var bubble=document.createElement('div');
      bubble.className='bubble';
      bubble.style.background=col;
      if(h.tier===1)bubble.style.boxShadow='0 3px 14px rgba(0,0,0,.3)';
      var sc=document.createElement('span');
      sc.className='b-score';
      sc.style.cssText='color:'+txt+';font-size:'+fs+'px';
      sc.textContent=String(h.score);
      var nm=document.createElement('span');
      nm.className='b-name';
      nm.style.fontSize=(fs-2)+'px';
      nm.textContent=h.name;
      bubble.appendChild(sc);
      bubble.appendChild(nm);
      var tail=document.createElement('div');
      tail.className='tail';
      tail.style.cssText='border-width:7px 5px 0 5px;border-color:'+col+' transparent transparent transparent';
      wrap.appendChild(bubble);
      wrap.appendChild(tail);
      new kakao.maps.CustomOverlay({
        position:new kakao.maps.LatLng(h.lat,h.lng),
        content:wrap,xAnchor:.5,yAnchor:1,zIndex:2
      }).setMap(map);
    });
    var SORTED=GEO.slice().sort(function(a,b){return b.score-a.score;});
    function edgePt(cx,cy,px,py,W,H,pad){
      var dx=px-cx,dy=py-cy;
      if(!dx&&!dy) return {x:cx,y:cy};
      var ts=[];
      if(dx>0)ts.push((W-pad-cx)/dx);
      if(dx<0)ts.push((pad-cx)/dx);
      if(dy>0)ts.push((H-pad-cy)/dy);
      if(dy<0)ts.push((pad-cy)/dy);
      var t=Math.min.apply(null,ts.filter(function(v){return v>0;}));
      return {x:Math.round(cx+dx*t),y:Math.round(cy+dy*t)};
    }
    function updateHints(){
      var hints=document.getElementById('hints');
      hints.innerHTML='';
      var proj=map.getProjection();
      var node=map.getNode();
      var W=node.clientWidth,H=node.clientHeight,pad=28,cx=W/2,cy=H/2;
      SORTED.forEach(function(h){
        var pt=proj.containerPointFromCoords(new kakao.maps.LatLng(h.lat,h.lng));
        var px=pt.x,py=pt.y;
        if(px>=pad&&px<=W-pad&&py>=pad&&py<=H-pad) return;
        var ep=edgePt(cx,cy,px,py,W,H,pad);
        var col=scoreCol(h.score),txt=scoreTxt(h.score);
        var ang=Math.atan2(py-cy,px-cx)*(180/Math.PI)+90;
        var el=document.createElement('div');
        el.className='hint';
        el.style.left=(ep.x-20)+'px';
        el.style.top=(ep.y-20)+'px';
        el.onclick=function(){tap(h.name);};
        el.innerHTML='<div style="width:32px;height:32px;border-radius:50%;background:'+col+';border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,11 6,8 1,11" fill="'+txt+'" transform="rotate('+ang+',6,6)"/></svg></div>';
        hints.appendChild(el);
      });
    }
    kakao.maps.event.addListener(map,'idle',updateHints);
    kakao.maps.event.addListener(map,'zoom_start',function(){document.getElementById('hints').innerHTML='';});
    updateHints();
});
</script>
</body>
</html>`;
}

/* ─── KakaoMapView ─── */
function KakaoMapView({ hoods, buildings, selected, onSelect }: {
  hoods: Hood[];
  buildings: Building[];
  selected: Hood;
  onSelect: (h: Hood) => void;
}) {
  const mapHtml = useMemo(() => buildMapHTML(hoods, buildings), [hoods, buildings]);

  const handleMessage = (data: string) => {
    try {
      const msg = JSON.parse(data) as { type: string; name?: string };
      if (msg.type === 'tap' && msg.name) {
        const h = hoods.find((hood) => hood.name === msg.name);
        if (h) onSelect(h);
      }
    } catch {}
  };

  return (
    <>
      <View style={{ flex: 1, margin: 14, marginTop: 0, borderRadius: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: '#F4F4F5' }}>
        <MapHtmlView html={mapHtml} onMessage={handleMessage} />
      </View>
      {/* 선택 동네 미리보기 */}
      <View className="flex-row items-center gap-2.5 mx-[14px] mb-[14px] bg-white rounded-2xl p-3"
        style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: scoreCol(selected.score),
          alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: scoreTxt(selected.score), fontWeight: '800', fontSize: 14, letterSpacing: -0.3 }}>{selected.score}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[12px] font-extrabold text-[#0A0A0B] tracking-[-0.12px]">{selected.name}</Text>
          <Text className="text-[10px] text-[#71717A]">{selected.meta}</Text>
        </View>
        <Pressable
          onPress={() => router.push(`/listing/${selected.rank}` as never)}
          style={{ width: 28, height: 28, backgroundColor: '#0A0A0B', borderRadius: 6,
            alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-forward" size={12} color="white" />
        </Pressable>
      </View>
    </>
  );
}

/* ─── ListCard ─── */
function ListCard({ h }: { h: Hood }) {
  const isTop = h.rank === 1;
  return (
    <View style={{ borderWidth: isTop ? 1.5 : 1, borderColor: isTop ? '#0A0A0B' : '#E4E4E7',
      borderRadius: 12, padding: 12, gap: 8, backgroundColor: 'white' }}>
      <View className="flex-row items-center gap-2.5">
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: TIER_BG[h.tier],
          alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 12, letterSpacing: -0.2 }}>{h.score}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-extrabold text-[#0A0A0B] tracking-[-0.13px]">{h.name}</Text>
          <Text className="text-[10px] text-[#71717A]">{h.meta}</Text>
        </View>
        {isTop && (
          <View className="px-1.5 py-0.5 bg-[#FAFAFA] rounded">
            <Text className="text-[9px] font-bold text-[#3F3F46]">TOP</Text>
          </View>
        )}
      </View>
      <View className="flex-row gap-1.5">
        {([['직장', h.scores.work], ['라이프', h.scores.life], ['안전', h.scores.safe]] as [string, number][]).map(([label, val]) => (
          <View key={label} className="flex-1 gap-[3px]">
            <Text className="text-[9px] text-[#71717A] font-semibold">{label}</Text>
            <View className="h-[3px] bg-[#E4E4E7] rounded-full overflow-hidden">
              <View className="h-full bg-[#0A0A0B] rounded-full" style={{ width: `${val}%` }} />
            </View>
            <Text className="text-[11px] font-extrabold text-[#0A0A0B] tracking-[-0.2px]">{val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── FilterSheet ─── */
const SORT_OPTIONS = ['매칭 점수 ↓', '통근 시간 ↑', '안전도 ↓'] as const;
const SCORE_OPTIONS = ['전체', '80+', '70+'] as const;
const FILTER_DEFAULT = { sort: '매칭 점수 ↓', score: '전체', hasProperty: true, floodSafe: false };

function FilterToggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}
      style={{ width: 28, height: 16, borderRadius: 8, backgroundColor: on ? '#0A0A0B' : '#D4D4D8', justifyContent: 'center' }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'white',
        position: 'absolute', left: on ? 14 : 2 }} />
    </Pressable>
  );
}

function FilterSheet({ onClose, count }: { onClose: () => void; count: number }) {
  const [sort, setSort] = useState(FILTER_DEFAULT.sort);
  const [score, setScore] = useState(FILTER_DEFAULT.score);
  const [hasProperty, setHasProperty] = useState(FILTER_DEFAULT.hasProperty);
  const [floodSafe, setFloodSafe] = useState(FILTER_DEFAULT.floodSafe);

  const reset = () => {
    setSort(FILTER_DEFAULT.sort);
    setScore(FILTER_DEFAULT.score);
    setHasProperty(FILTER_DEFAULT.hasProperty);
    setFloodSafe(FILTER_DEFAULT.floodSafe);
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,10,11,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 16, paddingBottom: 28, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#D4D4D8', alignSelf: 'center', marginBottom: 12 }} />
        <Text className="text-[15px] font-extrabold text-[#0A0A0B] tracking-[-0.15px] mb-[14px]">정렬 · 필터</Text>
        <Text className="text-[10px] font-bold text-[#3F3F46] tracking-[0.02em] mb-1.5">정렬</Text>
        <View className="flex-row flex-wrap gap-1 mb-4">
          {SORT_OPTIONS.map((o) => (
            <Pressable key={o} onPress={() => setSort(o)}
              className={`px-2.5 py-[5px] rounded-full border ${sort === o ? 'bg-[#0A0A0B] border-[#0A0A0B]' : 'bg-white border-[#E4E4E7]'}`}>
              <Text className={`text-[10px] font-semibold ${sort === o ? 'text-white' : 'text-[#3F3F46]'}`}>{o}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="text-[10px] font-bold text-[#3F3F46] tracking-[0.02em] mb-1.5">매칭 점수</Text>
        <View className="flex-row gap-1 mb-4">
          {SCORE_OPTIONS.map((o) => (
            <Pressable key={o} onPress={() => setScore(o)}
              className={`px-2.5 py-[5px] rounded-full border ${score === o ? 'bg-[#0A0A0B] border-[#0A0A0B]' : 'bg-white border-[#E4E4E7]'}`}>
              <Text className={`text-[10px] font-semibold ${score === o ? 'text-white' : 'text-[#3F3F46]'}`}>{o}</Text>
            </Pressable>
          ))}
        </View>
        {([['매물 보유 동네만', hasProperty, () => setHasProperty(v => !v)],
           ['침수 안전 동네만', floodSafe,  () => setFloodSafe(v => !v)]] as [string, boolean, () => void][]).map(([label, on, fn]) => (
          <View key={label} className="flex-row items-center justify-between py-2 border-t border-[#F4F4F5]">
            <Text className="text-[11px] font-semibold text-[#18181B]">{label}</Text>
            <FilterToggle on={on} onPress={fn} />
          </View>
        ))}
        <View className="flex-row gap-2 mt-3">
          <Pressable className="flex-1 py-[11px] rounded-xl border border-[#D4D4D8] items-center active:opacity-70" onPress={reset}>
            <Text className="text-[12px] font-bold text-[#18181B]">초기화</Text>
          </Pressable>
          <Pressable className="flex-1 py-[11px] rounded-xl bg-[#0A0A0B] items-center active:opacity-75" onPress={onClose}>
            <Text className="text-[12px] font-bold text-white">{count}개 보기</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ─── EmptyState ─── */
const SUGGESTIONS = ['통근 시간 45분 → 1시간', '예산 +10만원 상향', '라이프 태그 일부 해제'];

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-5 gap-4">
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#FAFAFA',
        borderWidth: 1, borderColor: '#E4E4E7', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="search-outline" size={36} color="#A1A1AA" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-[15px] font-extrabold text-[#0A0A0B] tracking-[-0.15px] text-center">맞춤 동네를{'\n'}찾지 못했어요</Text>
        <Text className="text-[11px] text-[#71717A] text-center leading-[1.5]">조건이 너무 좁아서 매칭이 되지 않았어요.{'\n'}몇 가지를 완화하면 결과를 받을 수 있어요.</Text>
      </View>
      <View className="w-full bg-[#FAFAFA] rounded-xl p-3 gap-2">
        <Text className="text-[9px] font-bold text-[#059669] tracking-[0.05em]">완화 제안</Text>
        {SUGGESTIONS.map((s) => (
          <View key={s} className="flex-row items-center gap-1.5">
            <View className="w-[14px] h-[14px] rounded-full bg-white border border-[#E4E4E7] items-center justify-center">
              <Ionicons name="checkmark" size={8} color="#059669" />
            </View>
            <Text className="text-[11px] text-[#18181B] font-medium">{s}</Text>
          </View>
        ))}
      </View>
      <Pressable
        className="w-full bg-[#0A0A0B] rounded-xl py-3 flex-row items-center justify-center gap-1.5 active:opacity-75"
        onPress={() => router.replace('/(onboarding)/start')}
      >
        <Text className="text-[12px] font-bold text-white">조건 다시 진단하기</Text>
        <Ionicons name="arrow-forward" size={12} color="white" />
      </Pressable>
    </View>
  );
}

/* ─── ViewToggle ─── */
function ViewToggle({ view, onChange }: { view: 'map' | 'list'; onChange: (v: 'map' | 'list') => void }) {
  return (
    <View className="flex-row bg-[#FAFAFA] rounded-full p-[3px] gap-0.5 self-start ml-[14px] mt-3 mb-2">
      {(['map', 'list'] as const).map((v) => (
        <Pressable key={v} onPress={() => onChange(v)}
          className={`flex-row items-center gap-1 px-[11px] py-[5px] rounded-full ${view === v ? 'bg-white' : ''}`}
          style={view === v ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, elevation: 2 } : {}}>
          <Ionicons name={v === 'map' ? 'map-outline' : 'list-outline'} size={11} color={view === v ? '#0A0A0B' : '#71717A'} />
          <Text style={{ fontSize: 10, fontWeight: view === v ? '700' : '600', color: view === v ? '#0A0A0B' : '#71717A' }}>
            {v === 'map' ? '지도' : '리스트'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ─── Main Screen ─── */
export default function CompleteScreen() {
  const { results: storeResults } = useDiagnosisStore();
  const hoods = storeResults.length > 0 ? storeResults : CANDIDATE_HOODS.slice(0, 5).map((h, i) => ({
    ...h, rank: i + 1, tier: (i === 0 ? 1 : i < 3 ? 2 : 3) as Hood['tier'],
  }));

  const [view, setView] = useState<'map' | 'list'>('map');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedHood, setSelectedHood] = useState<Hood>(hoods[0]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const isEmpty = storeResults.length === 0 && hoods.length === 0;

  useEffect(() => {
    if (hoods.length === 0) return;
    Promise.all(hoods.map((h) => fetchBuildingsNear(h.lat, h.lng))).then((results) => {
      const seen = new Set<string>();
      setBuildings(
        results.flat().filter((b) => {
          if (seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        })
      );
    });
  }, [hoods]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AppHeader title="맞춤 동네 결과" onAction={() => setShowFilter(true)} />

      {isEmpty ? (
        <EmptyState />
      ) : (
        <View style={{ flex: 1 }}>
          <ViewToggle view={view} onChange={setView} />

          {view === 'map' ? (
            <KakaoMapView hoods={hoods} buildings={buildings} selected={selectedHood} onSelect={setSelectedHood} />
          ) : (
            <ScrollView className="flex-1 px-[14px]" contentContainerStyle={{ gap: 8, paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
              {hoods.map((h) => <ListCard key={h.name} h={h} />)}
            </ScrollView>
          )}
        </View>
      )}

      <TabBar />

      {showFilter && <FilterSheet onClose={() => setShowFilter(false)} count={hoods.length} />}
    </SafeAreaView>
  );
}
