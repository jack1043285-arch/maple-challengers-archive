import React, { useState, useMemo } from 'react';
import { Upload, Calendar, TrendingUp, Swords, Shield, Hexagon, Activity, ChevronRight, Package, User, Sparkles, BookOpen, Crown, Layers, Clock, Settings, Zap, Star, AlertCircle, BarChart2 } from 'lucide-react';

export default function ViewerApp() {
  const [jsonData, setJsonData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [equipSubTab, setEquipSubTab] = useState('item'); 
  const [skillSubTab, setSkillSubTab] = useState('hexa'); 
  const [unionSubTab, setUnionSubTab] = useState('raider'); 
  const [logSubTab, setLogSubTab] = useState('summary_starforce'); // 통계 탭을 기본으로 변경
  
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        dataArray.sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
        
        setJsonData(dataArray);
        setCurrentIndex(dataArray.length - 1);
        setError('');
      } catch (err) {
        setError('올바른 JSON 형식이 아닙니다. 데이터북 파일을 다시 확인해주세요.');
      }
    };
    reader.readAsText(file);
  };

  const currentData = jsonData ? jsonData[currentIndex] : null;
  const firstData = jsonData ? jsonData[0] : null;

  const getStatValue = (data, statName) => {
    if (!data?.stats?.final_stat) return '0';
    const stat = data.stats.final_stat.find(s => s.stat_name === statName);
    return stat ? stat.stat_value : '0';
  };

  const formatAddOption = (addOpt) => {
    if (!addOpt) return null;
    const stats = [];
    if (Number(addOpt.str) > 0) stats.push(`STR +${addOpt.str}`);
    if (Number(addOpt.dex) > 0) stats.push(`DEX +${addOpt.dex}`);
    if (Number(addOpt.int) > 0) stats.push(`INT +${addOpt.int}`);
    if (Number(addOpt.luk) > 0) stats.push(`LUK +${addOpt.luk}`);
    if (Number(addOpt.max_hp) > 0) stats.push(`HP +${addOpt.max_hp}`);
    if (Number(addOpt.attack_power) > 0) stats.push(`공격력 +${addOpt.attack_power}`);
    if (Number(addOpt.magic_power) > 0) stats.push(`마력 +${addOpt.magic_power}`);
    if (Number(addOpt.boss_damage) > 0) stats.push(`보공 +${addOpt.boss_damage}%`);
    if (Number(addOpt.damage) > 0) stats.push(`데미지 +${addOpt.damage}%`);
    if (Number(addOpt.all_stat) > 0) stats.push(`올스탯 +${addOpt.all_stat}%`);
    return stats.length > 0 ? stats.join(', ') : null;
  };

  const chartData = useMemo(() => {
    if (!jsonData || jsonData.length < 2) return null;
    const points = jsonData.map((d, i) => ({ x: i, y: Number(getStatValue(d, '전투력')), date: d.targetDate }));
    const maxCp = Math.max(...points.map(p => p.y), 1);
    const minCp = Math.min(...points.map(p => p.y));
    return { points, maxCp, minCp };
  }, [jsonData]);

  const generatedExpHistory = useMemo(() => {
    if (!jsonData) return [];
    const history = [];
    for (let i = 0; i <= currentIndex; i++) {
      const data = jsonData[i];
      if (data && data.basic) {
        const currentLevel = data.basic.character_level;
        const currentExp = Number(data.basic.character_exp);
        const currentRate = Number(data.basic.character_exp_rate);
        let gainedRate = 0;
        let isLevelUp = false;

        if (i > 0) {
          const prevData = jsonData[i - 1];
          if (prevData && prevData.basic) {
            const prevLevel = prevData.basic.character_level;
            const prevRate = Number(prevData.basic.character_exp_rate);
            if (currentLevel === prevLevel) {
              gainedRate = currentRate - prevRate;
            } else if (currentLevel > prevLevel) {
              isLevelUp = true;
              gainedRate = (100 - prevRate) + currentRate;
            }
          }
        }

        const dateObj = new Date(data.targetDate);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = days[dateObj.getDay()];

        history.push({
          date: data.targetDate,
          dayOfWeek,
          level: currentLevel,
          exp: currentExp,
          expRate: currentRate,
          gainedRate,
          isLevelUp,
          isFirst: i === 0
        });
      }
    }
    return history.reverse();
  }, [jsonData, currentIndex]);

  // --- 추가: 강화 기록 병합 및 통계 처리 로직 ---
  const { sfSummaryArray, cubeSummaryArray } = useMemo(() => {
    if (!jsonData) return { sfSummaryArray: [], cubeSummaryArray: [] };

    const sfSet = new Set();
    const cubeSet = new Set();
    const sfSummary = {};
    const cubeSummary = {};

    jsonData.forEach(data => {
      // 1. 스타포스 취합
      data.historyStarforce?.starforce_history?.forEach(log => {
        // 정확히 동일한 시간, 아이템, 상태가 중복 기록되지 않도록 Set으로 필터링
        const key = `${log.date_create}_${log.target_item}_${log.before_starforce_count}_${log.item_upgrade_result}`;
        if (!sfSet.has(key)) {
          sfSet.add(key);
          const item = log.target_item || '알 수 없는 장비';
          
          if (!sfSummary[item]) {
            sfSummary[item] = {
              name: item,
              startStar: log.before_starforce_count,
              endStar: log.after_starforce_count,
              totalTries: 0,
              destroys: 0,
              success: 0,
              fail: 0,
              maxTargetStar: 0,
              targetStarStats: {},
              startDate: log.date_create.split('T')[0],
              endDate: log.date_create.split('T')[0]
            };
          }
          
          const s = sfSummary[item];
          // 순차적으로 끝나는 별 최신화 (Set과 별개로 단순 추적)
          if (new Date(log.date_create) > new Date(s.endDate)) {
            s.endStar = log.after_starforce_count;
            s.endDate = log.date_create.split('T')[0];
          }
          if (new Date(log.date_create) < new Date(s.startDate)) {
            s.startStar = log.before_starforce_count;
            s.startDate = log.date_create.split('T')[0];
          }
          
          s.totalTries++;
          const target = log.before_starforce_count + 1;
          if (target > s.maxTargetStar) s.maxTargetStar = target;
          
          if (!s.targetStarStats[target]) s.targetStarStats[target] = { success: 0, fail: 0, destroy: 0 };

          if (log.item_upgrade_result === '성공') {
            s.success++;
            s.targetStarStats[target].success++;
          } else if (log.item_upgrade_result === '파괴') {
            s.destroys++;
            s.targetStarStats[target].destroy++;
          } else {
            s.fail++;
            s.targetStarStats[target].fail++;
          }
        }
      });

      // 2. 큐브/잠재 취합
      data.historyCube?.cube_history?.forEach(log => {
        const key = `${log.date_create}_${log.target_item}_${log.cube_type}`;
        if (!cubeSet.has(key)) {
          cubeSet.add(key);
          const item = log.target_item || '알 수 없는 장비';
          if (!cubeSummary[item]) cubeSummary[item] = { name: item, types: {} };
          cubeSummary[item].types[log.cube_type] = (cubeSummary[item].types[log.cube_type] || 0) + 1;
        }
      });

      data.historyPotential?.potential_history?.forEach(log => {
        const key = `${log.date_create}_${log.target_item}_${log.potential_type}`;
        if (!cubeSet.has(key)) {
          cubeSet.add(key);
          const item = log.target_item || '알 수 없는 장비';
          if (!cubeSummary[item]) cubeSummary[item] = { name: item, types: {} };
          cubeSummary[item].types[log.potential_type] = (cubeSummary[item].types[log.potential_type] || 0) + 1;
        }
      });
    });

    // 정렬 (도전 횟수/사용 횟수 순)
    const sfArr = Object.values(sfSummary).sort((a, b) => b.totalTries - a.totalTries);
    const cubeArr = Object.values(cubeSummary).sort((a, b) => {
      const aTotal = Object.values(a.types).reduce((acc, v) => acc + v, 0);
      const bTotal = Object.values(b.types).reduce((acc, v) => acc + v, 0);
      return bTotal - aTotal;
    });

    return { sfSummaryArray: sfArr, cubeSummaryArray: cubeArr };
  }, [jsonData]);
  // ----------------------------------------------------

  if (!jsonData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-500">
            <Upload className="w-10 h-10 text-orange-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">데이터북 뷰어 PRO</h1>
            <p className="text-sm text-slate-400">
              저장해둔 JSON 확장판 파일을 업로드하여<br/>세분화된 장비, 스킬, 스탯을 확인하세요.
            </p>
          </div>
          <label className="block w-full cursor-pointer bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-orange-900/20">
            <span>JSON 파일 열기</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
          {error && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">{error}</p>}
        </div>
      </div>
    );
  }

  const NoDataAlert = ({ message }) => (
    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
      <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
      <p className="text-sm">{message || "데이터가 존재하지 않거나 수집되지 않았습니다."}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111318] text-slate-100 font-sans pb-20">
      <div className="bg-[#181a20] border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Challengers Viewer <span className="text-orange-500 text-sm bg-orange-500/10 px-2 py-0.5 rounded-full ml-1">PRO</span></h1>
          </div>
          {jsonData.length > 1 && (
            <div className="flex-1 max-w-2xl w-full flex flex-col sm:flex-row items-center gap-3 px-4">
              {/* 날짜 직접 입력 영역 (키보드 지원) */}
              <div className="flex items-center space-x-2 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700 w-full sm:w-auto shrink-0">
                <Calendar className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <input 
                  type="date" 
                  value={jsonData[currentIndex].targetDate}
                  min={jsonData[0].targetDate}
                  max={jsonData[jsonData.length - 1].targetDate}
                  onChange={(e) => {
                    if(!e.target.value) return; // 미입력 시 무시
                    const selectedTime = new Date(e.target.value).getTime();
                    let closestIdx = 0;
                    let minDiff = Infinity;
                    // 선택/입력한 날짜와 가장 가까운 데이터 인덱스 찾기
                    jsonData.forEach((d, i) => {
                      const diff = Math.abs(new Date(d.targetDate).getTime() - selectedTime);
                      if (diff < minDiff) { 
                        minDiff = diff; 
                        closestIdx = i; 
                      }
                    });
                    setCurrentIndex(closestIdx);
                  }}
                  className="bg-transparent text-orange-400 font-bold text-sm focus:outline-none [color-scheme:dark] cursor-pointer w-full"
                />
              </div>

              {/* 기존 슬라이더 영역 */}
              <div className="flex-1 w-full flex items-center space-x-3">
                <span className="text-xs text-slate-500 whitespace-nowrap">{jsonData[0].targetDate.slice(5)}</span>
                <input 
                  type="range" min="0" max={jsonData.length - 1} value={currentIndex}
                  onChange={(e) => setCurrentIndex(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <span className="text-xs text-slate-500 whitespace-nowrap">{jsonData[jsonData.length - 1].targetDate.slice(5)}</span>
              </div>
            </div>
          )}
          <button onClick={() => setJsonData(null)} className="text-sm text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg whitespace-nowrap">
            파일 닫기
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        
        {currentData.basic && (
          <div className="bg-gradient-to-r from-[#1e2028] to-[#181a20] rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <div className="relative z-10 w-28 h-28 bg-[#181a20] rounded-2xl border border-slate-700 flex-shrink-0 flex items-center justify-center shadow-lg">
              <img src={currentData.basic.character_image} alt="캐릭터" className="max-w-full max-h-full object-contain" />
            </div>
            
            <div className="relative z-10 flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-slate-400 mb-2">
                <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full">{currentData.basic.world_name}</span>
                <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full">{currentData.basic.character_class}</span>
                {currentData.guild?.guild_name && (
                  <span className="px-2 py-0.5 bg-indigo-900/30 text-indigo-300 border border-indigo-700/50 rounded-full">길드: {currentData.guild.guild_name}</span>
                )}
                <span className="px-2 py-0.5 text-orange-400 border border-orange-700/50 bg-orange-900/20 rounded-full">
                  조회일: {currentData.targetDate}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
                {currentData.basic.character_name}
                {currentData.title?.title_name && <span className="text-sm font-normal text-yellow-400 ml-3">[{currentData.title.title_name}]</span>}
              </h2>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase">Level</span>
                  <span className="text-lg font-bold text-orange-400">{currentData.basic.character_level}</span>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase">Combat Power</span>
                  <span className="text-lg font-bold text-blue-400">{Number(getStatValue(currentData, '전투력')).toLocaleString()}</span>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase">Union</span>
                  <span className="text-lg font-bold text-purple-400">{currentData.union?.union_level || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 메인 탭 메뉴 */}
        <div className="flex space-x-1 border-b border-slate-800 pb-px overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', icon: TrendingUp, label: '타임라인' },
            { id: 'character', icon: User, label: '캐릭터 정보' },
            { id: 'stats', icon: Swords, label: '스탯/어빌리티' },
            { id: 'equipment', icon: Package, label: '장비' },
            { id: 'skills', icon: Hexagon, label: '스킬' },
            { id: 'union', icon: Crown, label: '유니온/로그' },
          ].map((tab) => (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-5 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-orange-500 text-orange-400 bg-orange-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1e2028]'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in duration-300">
          
          {/* 1. 타임라인 (Overview) */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center">
                    <Activity className="w-4 h-4 mr-2" /> 누적 성장 요약
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>최초 ({firstData?.targetDate})</span>
                      <span>현재 ({currentData?.targetDate})</span>
                    </div>
                    {[
                      { label: '레벨', old: firstData?.basic?.character_level || 0, curr: currentData?.basic?.character_level || 0 },
                      { label: '전투력', old: Number(getStatValue(firstData, '전투력')), curr: Number(getStatValue(currentData, '전투력')) },
                      { label: '유니온 레벨', old: firstData?.union?.union_level || 0, curr: currentData?.union?.union_level || 0 }
                    ].map((comp, idx) => (
                      <div key={idx} className="bg-[#181a20] p-4 rounded-xl border border-slate-700/30 relative overflow-hidden">
                        <span className="text-xs text-slate-400 block mb-1">{comp.label}</span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 line-through">{comp.old.toLocaleString()}</span>
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                          <span className="text-lg font-bold text-green-400">{comp.curr.toLocaleString()}</span>
                        </div>
                        <div className="absolute right-4 top-2 text-[10px] text-green-500/80 bg-green-500/10 px-1.5 py-0.5 rounded">
                          +{ (comp.curr - comp.old).toLocaleString() }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col">
                <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" /> 전투력 변화 추이 차트
                </h3>
                {jsonData.length > 1 && chartData ? (
                  <div className="flex-1 relative min-h-[300px] w-full">
                    <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-[10px] text-slate-500 border-r border-slate-700 pr-2 pb-2 text-right">
                      <span>{chartData.maxCp.toLocaleString()}</span>
                      <span>{chartData.minCp.toLocaleString()}</span>
                    </div>
                    <div className="absolute left-16 right-0 top-0 bottom-6">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="gradientCp" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                        </defs>
                        <polyline
                          fill="none" stroke="url(#gradientCp)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                          points={chartData.points.map((p, i) => {
                            const x = (i / (chartData.points.length - 1)) * 100;
                            const y = chartData.maxCp === chartData.minCp ? 50 : 100 - ((p.y - chartData.minCp) / (chartData.maxCp - chartData.minCp)) * 100;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                      </svg>
                      {(() => {
                        const p = chartData.points[currentIndex];
                        const xPercent = (currentIndex / (chartData.points.length - 1)) * 100;
                        const yPercent = chartData.maxCp === chartData.minCp ? 50 : 100 - ((p.y - chartData.minCp) / (chartData.maxCp - chartData.minCp)) * 100;
                        return (
                          <div 
                            className="absolute w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-slate-900 shadow-[0_0_10px_rgba(249,115,22,0.8)] transition-all duration-300"
                            style={{ left: `${xPercent}%`, top: `${yPercent}%`, transform: 'translate(-50%, -50%)' }}
                          />
                        );
                      })()}
                    </div>
                    <div className="absolute left-16 right-0 bottom-0 h-6 flex justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-700">
                      <span>{chartData.points[0].date}</span>
                      <span>{chartData.points[chartData.points.length - 1].date}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm bg-slate-800/30 rounded-xl">
                    데이터가 1일치 뿐이라 차트를 생성할 수 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. 캐릭터 정보 (Character) 생략 없이 유지 */}
          {activeTab === 'character' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Sparkles className="w-4 h-4 mr-2 text-pink-400" /> 뷰티 및 외형</h3>
                {currentData.beauty ? (
                  <div className="space-y-4">
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">헤어</span>
                      <div className="font-semibold text-slate-200">{currentData.beauty.character_hair?.hair_name || '기본 헤어'}</div>
                      {currentData.beauty.character_hair?.mix_color && (
                        <div className="text-xs text-pink-300 mt-1">믹스: {currentData.beauty.character_hair.base_color} + {currentData.beauty.character_hair.mix_color} ({currentData.beauty.character_hair.mix_rate}%)</div>
                      )}
                    </div>
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">성형</span>
                      <div className="font-semibold text-slate-200">{currentData.beauty.character_face?.face_name || '기본 성형'}</div>
                      {currentData.beauty.character_face?.mix_color && (
                        <div className="text-xs text-pink-300 mt-1">믹스: {currentData.beauty.character_face.base_color} + {currentData.beauty.character_face.mix_color} ({currentData.beauty.character_face.mix_rate}%)</div>
                      )}
                    </div>
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">피부</span>
                      <div className="font-semibold text-slate-200">{currentData.beauty.character_skin_name || '기본 피부'}</div>
                    </div>
                  </div>
                ) : <NoDataAlert message="뷰티 데이터가 없습니다." />}
              </div>

              <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Star className="w-4 h-4 mr-2 text-yellow-400" /> 성향</h3>
                {currentData.propensity ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: '카리스마', lv: currentData.propensity.charisma_level },
                      { name: '감성', lv: currentData.propensity.sensibility_level },
                      { name: '통찰력', lv: currentData.propensity.insight_level },
                      { name: '의지', lv: currentData.propensity.willingness_level },
                      { name: '손재주', lv: currentData.propensity.handicraft_level },
                      { name: '매력', lv: currentData.propensity.charm_level }
                    ].map((prop, idx) => (
                      <div key={idx} className="bg-[#181a20] p-3 rounded-lg border border-slate-700/50 text-center">
                        <span className="text-xs text-slate-400 block mb-1">{prop.name}</span>
                        <span className="text-lg font-bold text-slate-200">Lv.{prop.lv}</span>
                      </div>
                    ))}
                  </div>
                ) : <NoDataAlert message="성향 데이터가 없습니다." />}
              </div>

              <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Shield className="w-4 h-4 mr-2 text-indigo-400" /> 길드 및 커뮤니티</h3>
                <div className="space-y-4">
                  {currentData.guild ? (
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">소속 길드</span>
                      <div className="flex justify-between items-end">
                        <span className="font-semibold text-lg text-indigo-300">{currentData.guild.guild_name}</span>
                        <span className="text-xs text-slate-400">Lv.{currentData.guild.guild_level}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">마스터: {currentData.guild.guild_master_name}</div>
                    </div>
                  ) : <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50 text-slate-500 text-sm">길드 없음</div>}
                  <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50 flex justify-between items-center">
                    <span className="text-xs text-slate-400">인기도</span>
                    <span className="font-bold text-slate-200">{currentData.popularity?.popularity || 0}</span>
                  </div>
                  {currentData.title && currentData.title.title_name && (
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">착용 칭호</span>
                      <span className="font-bold text-yellow-400 text-sm">{currentData.title.title_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. 스탯 (Stats) 생략 없이 유지 */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center">
                  <Swords className="w-4 h-4 mr-2 text-red-400" /> 상세 전투 스탯
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {currentData.stats?.final_stat?.map((stat, idx) => (
                    <div key={idx} className="bg-[#181a20] px-3 py-2 rounded-lg border border-slate-700/30 flex flex-col justify-center">
                      <span className="text-[10px] text-slate-500 mb-0.5 truncate" title={stat.stat_name}>{stat.stat_name}</span>
                      <span className="font-semibold text-slate-200 text-sm">
                        {isNaN(Number(stat.stat_value)) || stat.stat_value.includes('%') ? stat.stat_value : Number(stat.stat_value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Zap className="w-4 h-4 mr-2 text-yellow-400" /> 어빌리티</h3>
                  {currentData.ability?.ability_info ? (
                    <div>
                      <span className="text-xs bg-[#181a20] px-2 py-1 rounded text-slate-300 mb-3 inline-block border border-slate-700">등급: {currentData.ability.ability_grade}</span>
                      <ul className="space-y-2">
                        {currentData.ability.ability_info.map((abil, idx) => (
                          <li key={idx} className="text-sm text-slate-300 flex items-start bg-[#181a20] p-3 rounded-lg border border-slate-700/50">
                            <span className="text-orange-400 mr-2 mt-0.5">▪</span> <span className="leading-tight">{abil.ability_value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : <NoDataAlert message="어빌리티 데이터 없음" />}
                </div>
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-green-400" /> 하이퍼 스탯</h3>
                  {currentData.hyperStat ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {(currentData.hyperStat.hyper_stat_preset_1 || []).filter(h => h.stat_level > 0).map((hs, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-[#181a20] px-3 py-2 rounded-lg">
                          <span className="text-slate-400">{hs.stat_type}</span>
                          <span className="font-bold text-green-400">Lv.{hs.stat_level}</span>
                        </div>
                      ))}
                    </div>
                  ) : <NoDataAlert message="하이퍼스탯 데이터 없음" />}
                </div>
              </div>
            </div>
          )}

          {/* 4. 장비 (Equipment) 생략 없이 유지 */}
          {activeTab === 'equipment' && (
            <div className="space-y-6">
              <div className="flex space-x-2 border-b border-slate-800 pb-2">
                {[
                  { id: 'item', label: '장착 아이템' }, { id: 'cash', label: '캐시 장비' },
                  { id: 'pet', label: '펫/안드로이드' }, { id: 'symbol', label: '심볼' }, { id: 'set', label: '세트 효과' }
                ].map(st => (
                  <button key={st.id} onClick={() => setEquipSubTab(st.id)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${equipSubTab === st.id ? 'bg-orange-600 text-white' : 'bg-[#181a20] text-slate-400 hover:bg-slate-700'}`}
                  >{st.label}</button>
                ))}
              </div>
              {equipSubTab === 'item' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentData.equipment?.item_equipment?.length > 0 ? (
                    currentData.equipment.item_equipment.map((item, idx) => {
                      const addOptionText = formatAddOption(item.item_add_option);
                      const hasPot = item.potential_option_1 || item.potential_option_2 || item.potential_option_3;
                      const hasAddPot = item.additional_potential_option_1 || item.additional_potential_option_2 || item.additional_potential_option_3;
                      return (
                        <div key={idx} className="bg-[#1e2028] rounded-xl border border-slate-700/50 flex flex-col overflow-hidden">
                          <div className="p-4 flex gap-4 border-b border-slate-700/50 bg-[#181a20]">
                            <div className="w-14 h-14 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center flex-shrink-0 relative">
                              <img src={item.item_shape_icon} alt={item.item_name} className="w-10 h-10 object-contain drop-shadow-md z-10" />
                              {item.starforce !== "0" && <div className="absolute top-0.5 left-0 right-0 flex justify-center text-[9px] text-yellow-400 font-bold z-0">★{item.starforce}</div>}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="text-[10px] text-slate-400 uppercase">{item.item_equipment_part}</div>
                              <div className="text-sm font-bold text-slate-200 truncate" title={item.item_name}>{item.item_name}{Number(item.scroll_upgrade) > 0 && <span className="text-blue-400 ml-1">(+{item.scroll_upgrade})</span>}</div>
                            </div>
                          </div>
                          <div className="p-3 space-y-2 bg-[#181a20]/50 flex-1 text-xs">
                            {addOptionText && (
                              <div className="bg-green-900/10 border border-green-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-green-400 block mb-0.5">추가옵션</span><span className="text-slate-300">{addOptionText}</span>
                              </div>
                            )}
                            {hasPot && (
                              <div className="bg-cyan-900/10 border border-cyan-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-cyan-400 block mb-0.5">잠재 ({item.potential_option_grade})</span>
                                <ul className="text-slate-300 space-y-0.5">
                                  {item.potential_option_1 && <li>{item.potential_option_1}</li>}
                                  {item.potential_option_2 && <li>{item.potential_option_2}</li>}
                                  {item.potential_option_3 && <li>{item.potential_option_3}</li>}
                                </ul>
                              </div>
                            )}
                            {hasAddPot && (
                              <div className="bg-purple-900/10 border border-purple-500/20 p-2 rounded">
                                <span className="text-[10px] font-bold text-purple-400 block mb-0.5">에디 ({item.additional_potential_option_grade})</span>
                                <ul className="text-slate-300 space-y-0.5">
                                  {item.additional_potential_option_1 && <li>{item.additional_potential_option_1}</li>}
                                  {item.additional_potential_option_2 && <li>{item.additional_potential_option_2}</li>}
                                  {item.additional_potential_option_3 && <li>{item.additional_potential_option_3}</li>}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : <div className="col-span-full"><NoDataAlert message="장착 아이템 데이터 없음" /></div>}
                </div>
              )}
              {equipSubTab === 'cash' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {currentData.cashEquipment?.cash_item_equipment_preset_1?.length > 0 ? (
                    currentData.cashEquipment.cash_item_equipment_preset_1.map((item, idx) => (
                      <div key={idx} className="bg-[#1e2028] p-3 rounded-xl border border-slate-700/50 flex flex-col items-center text-center">
                        <div className="w-12 h-12 mb-2 flex items-center justify-center"><img src={item.cash_item_icon} alt="cash" className="max-w-full max-h-full object-contain" /></div>
                        <span className="text-[10px] text-slate-500">{item.cash_item_equipment_part}</span>
                        <span className="text-xs font-semibold text-slate-200 mt-1 line-clamp-2">{item.cash_item_name}</span>
                      </div>
                    ))
                  ) : <div className="col-span-full"><NoDataAlert message="캐시 장비 데이터 없음" /></div>}
                </div>
              )}
              {equipSubTab === 'pet' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">안드로이드</h3>
                    {currentData.android?.android_name ? (
                      <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-900 rounded border flex items-center justify-center"><img src={currentData.android.android_icon} alt="android" /></div>
                        <div><div className="font-bold text-slate-200 mb-1">{currentData.android.android_name}</div><div className="text-xs text-slate-400">헤어: {currentData.android.android_hair?.hair_name}</div><div className="text-xs text-slate-400">성형: {currentData.android.android_face?.face_name}</div></div>
                      </div>
                    ) : <NoDataAlert message="안드로이드 데이터 없음" />}
                  </div>
                  <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">펫</h3>
                    {currentData.pet ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(num => {
                          const petName = currentData.pet[`pet_${num}_name`];
                          if (!petName) return null;
                          return (
                            <div key={num} className="bg-[#181a20] p-3 rounded-xl border border-slate-700 flex items-center gap-4">
                              <img src={currentData.pet[`pet_${num}_icon`]} alt="pet" className="w-10 h-10 object-contain" />
                              <div className="text-sm font-medium text-slate-200">{petName}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <NoDataAlert message="펫 데이터 없음" />}
                  </div>
                </div>
              )}
              {equipSubTab === 'symbol' && (
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentData.symbols?.symbol?.length > 0 ? (
                      currentData.symbols.symbol.map((sym, idx) => (
                        <div key={idx} className="bg-[#181a20] p-4 rounded-xl flex items-center justify-between border border-slate-700/50">
                          <div className="flex items-center gap-4">
                            <img src={sym.symbol_icon} alt="symbol" className="w-12 h-12 object-contain" />
                            <div><div className="text-sm font-semibold text-slate-200">{sym.symbol_name}</div><div className="text-xs text-slate-400 mt-0.5">성장: {sym.symbol_growth_count}/{sym.symbol_require_growth_count}</div></div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-orange-400">Lv. {sym.symbol_level}</div>
                            <div className="text-xs text-blue-300 mt-0.5">포스 +{sym.symbol_force}</div>
                          </div>
                        </div>
                      ))
                    ) : <div className="col-span-full"><NoDataAlert message="장착 중인 심볼 없음" /></div>}
                  </div>
                </div>
              )}
              {equipSubTab === 'set' && (
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {currentData.setEffect?.set_effect?.length > 0 ? (
                    currentData.setEffect.set_effect.map((setInfo, idx) => (
                      <div key={idx} className="bg-[#181a20] rounded-xl border border-slate-700/50 p-5">
                        <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                          <h4 className="font-bold text-slate-200 text-sm">{setInfo.set_name}</h4>
                          <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded-lg border border-orange-500/30">{setInfo.total_set_count}세트 적용</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-400">
                          {setInfo.set_effect_info.map((eff, i) => (
                            <div key={i} className={`p-2 rounded ${eff.set_count <= setInfo.total_set_count ? 'bg-green-900/10 text-green-300' : 'opacity-50'}`}>
                              <span className="font-semibold block mb-0.5">{eff.set_count}세트 효과</span><span className="whitespace-pre-wrap">{eff.set_option}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : <div className="col-span-full"><NoDataAlert message="적용 중인 세트 효과가 없습니다." /></div>}
                </div>
              )}
            </div>
          )}

          {/* 5. 스킬 (Skills) 생략 없이 유지 */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex space-x-2 border-b border-slate-800 pb-2">
                {[{ id: 'hexa', label: '6차 (HEXA)' }, { id: 'vmatrix', label: '5차 (V 매트릭스)' }, { id: 'basic', label: '1~4차/하이퍼' }, { id: 'link', label: '링크 스킬' }].map(st => (
                  <button key={st.id} onClick={() => setSkillSubTab(st.id)} className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${skillSubTab === st.id ? 'bg-orange-600 text-white' : 'bg-[#181a20] text-slate-400 hover:bg-slate-700'}`}>{st.label}</button>
                ))}
              </div>
              {skillSubTab === 'hexa' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentData.hexa?.character_hexa_core_equipment?.length > 0 ? (
                    currentData.hexa.character_hexa_core_equipment.map((core, idx) => (
                      <div key={idx} className="bg-[#1e2028] p-5 rounded-xl border border-slate-700/50 flex flex-col h-full relative overflow-hidden group">
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10"></div>
                        <div className="relative z-10 flex justify-between items-start mb-3">
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded bg-[#181a20] text-purple-400 border border-purple-500/20">{core.hexa_core_type}</span>
                          <span className="text-xl font-black text-white italic drop-shadow-md">Lv.{core.hexa_core_level}</span>
                        </div>
                        <div className="relative z-10 flex-1 flex items-end"><h4 className="text-sm font-bold text-slate-200 leading-tight">{core.hexa_core_name}</h4></div>
                      </div>
                    ))
                  ) : <div className="col-span-full"><NoDataAlert message="HEXA 매트릭스 데이터 없음" /></div>}
                </div>
              )}
              {skillSubTab === 'vmatrix' && (
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentData.vmatrix?.character_v_core_equipment?.length > 0 ? (
                    currentData.vmatrix.character_v_core_equipment.map((core, idx) => (
                      <div key={idx} className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50 flex gap-4 items-center">
                        <img src={core.v_core_icon} alt="vcore" className="w-12 h-12 object-contain" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-blue-400 mb-0.5">{core.v_core_type}</div>
                          <div className="text-sm font-bold text-slate-200 truncate" title={core.v_core_name}>{core.v_core_name}</div>
                          <div className="text-xs text-slate-400 mt-1">Lv.{core.v_core_level}</div>
                        </div>
                      </div>
                    ))
                  ) : <div className="col-span-full"><NoDataAlert message="V 매트릭스 장착 코어 없음" /></div>}
                </div>
              )}
              {skillSubTab === 'basic' && (
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg max-h-[600px] overflow-y-auto custom-scrollbar">
                  {currentData.skills ? (
                    <div className="space-y-8">
                      {["hyper", "6", "5", "4", "3", "2", "1", "0"].map(grade => {
                        const sData = currentData.skills[`grade_${grade}`];
                        if (!sData?.character_skill?.length) return null;
                        return (
                          <div key={grade}>
                            <h4 className="text-sm font-bold text-orange-400 mb-3 border-b border-slate-700 pb-2">{grade === 'hyper' ? '하이퍼 스킬' : `${grade}차 스킬`}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {sData.character_skill.map((sk, idx) => (
                                <div key={idx} className="bg-[#181a20] p-3 rounded-lg border border-slate-700/50 flex items-center gap-3">
                                  <img src={sk.skill_icon} alt="skill" className="w-8 h-8 object-contain rounded" />
                                  <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-slate-200 truncate">{sk.skill_name}</div><div className="text-[10px] text-slate-500">Lv.{sk.skill_level}</div></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <NoDataAlert message="스킬 트리 데이터 없음" />}
                </div>
              )}
              {skillSubTab === 'link' && (
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentData.linkSkill?.character_link_skill_equipment?.length > 0 ? (
                    currentData.linkSkill.character_link_skill_equipment.map((link, idx) => (
                      <div key={idx} className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50 flex items-center gap-4">
                        <img src={link.skill_icon} alt="link" className="w-10 h-10 object-contain rounded-lg bg-slate-900" />
                        <div><div className="text-sm font-bold text-slate-200">{link.skill_name}</div><div className="text-xs text-orange-400 mt-1">Lv.{link.skill_level}</div></div>
                      </div>
                    ))
                  ) : <div className="col-span-full"><NoDataAlert message="장착된 링크 스킬 없음" /></div>}
                </div>
              )}
            </div>
          )}

          {/* 6. 유니온/로그 (Union / Logs) */}
          {activeTab === 'union' && (
            <div className="space-y-6">
              <div className="flex space-x-2 border-b border-slate-800 pb-2">
                {[
                  { id: 'summary_starforce', label: '★ 강화 통계' },
                  { id: 'summary_cube', label: '🎲 큐브/잠재 통계' },
                  { id: 'exp', label: '경험치 이력' },
                  { id: 'logs', label: '전체 로그' },
                  { id: 'rank', label: '랭킹 및 무릉' },
                ].map(st => (
                  <button
                    key={st.id} onClick={() => setLogSubTab(st.id)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                      logSubTab === st.id ? 'bg-orange-600 text-white' : 'bg-[#181a20] text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* [NEW] 스타포스 강화 통계 요약 (이미지 1) */}
              {logSubTab === 'summary_starforce' && (
                <div className="space-y-4">
                  <div className="bg-[#181a20] p-3 rounded text-xs text-slate-400 border border-slate-800">
                    * API 특성상 메소 소모량은 제공되지 않아 <strong className="text-slate-200">횟수</strong> 기반으로 누적 계산하여 보여줍니다.
                  </div>
                  
                  {sfSummaryArray.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {sfSummaryArray.map((sf, idx) => {
                        const targetStar = sf.maxTargetStar;
                        const targetStats = sf.targetStarStats[targetStar] || { success: 0, fail: 0, destroy: 0 };
                        
                        return (
                          <div key={idx} className="bg-[#1e2028] rounded-xl border border-slate-700/50 p-5 flex flex-col text-center hover:border-orange-500/30 transition-colors shadow-lg relative overflow-hidden">
                            {/* 상단 장비 이름 */}
                            <div className="text-sm font-semibold text-slate-200 mb-3 truncate" title={sf.name}>
                              {sf.name}
                            </div>
                            
                            {/* 별 변화 */}
                            <div className="flex items-center justify-center space-x-2 text-lg font-black text-orange-400 mb-3">
                              <span>★{sf.startStar}</span>
                              <ChevronRight className="w-5 h-5 text-slate-500" />
                              <span>★{sf.endStar}</span>
                            </div>

                            {/* 종합 성공/파괴 */}
                            <div className="text-xs text-slate-400 mb-2">
                              강화/파괴 <span className="text-slate-200">{sf.totalTries}번</span> / <span className="text-red-400">{sf.destroys}번</span>
                            </div>

                            {/* 주요 타겟 도전 결과 */}
                            {targetStar > 0 && (
                              <div className="text-[10px] bg-[#181a20] rounded p-2 border border-slate-700/50 mt-auto mb-3">
                                <div className="font-bold text-yellow-400 mb-1">★{targetStar} 도전 기록</div>
                                <div className="flex justify-center space-x-2 text-slate-300">
                                  <span><span className="text-green-400">{targetStats.success}</span>성공</span>
                                  <span><span className="text-slate-500">{targetStats.fail}</span>실패</span>
                                  {targetStats.destroy > 0 && <span><span className="text-red-400">{targetStats.destroy}</span>파괴</span>}
                                </div>
                              </div>
                            )}

                            {/* 기간 */}
                            <div className="text-[9px] text-slate-500 tracking-wider">
                              {sf.startDate} ~ {sf.endDate}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <NoDataAlert message="수집된 전체 기간 동안의 스타포스 강화 기록이 없습니다." />}
                </div>
              )}

              {/* [NEW] 큐브 및 잠재능력 통계 요약 (이미지 2) */}
              {logSubTab === 'summary_cube' && (
                <div className="space-y-4">
                  <div className="bg-[#181a20] p-3 rounded text-xs text-slate-400 border border-slate-800">
                    * 수집된 모든 날짜의 큐브 및 잠재능력 재설정(메소) 횟수를 취합한 결과입니다.
                  </div>

                  {cubeSummaryArray.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {cubeSummaryArray.map((cube, idx) => {
                        const types = Object.entries(cube.types).sort((a,b) => b[1] - a[1]);
                        
                        return (
                          <div key={idx} className="bg-[#1e2028] rounded-xl border border-slate-700/50 p-5 flex flex-col hover:border-purple-500/30 transition-colors shadow-lg">
                            <div className="text-sm font-semibold text-slate-200 text-center mb-4 truncate border-b border-slate-700 pb-2" title={cube.name}>
                              {cube.name}
                            </div>
                            
                            <div className="space-y-2 flex-1">
                              {types.map(([typeName, count], i) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-[#181a20] p-2 rounded">
                                  <span className="flex items-center text-slate-300">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${typeName.includes('블랙') ? 'bg-slate-500' : typeName.includes('레드') ? 'bg-red-500' : typeName.includes('에디') ? 'bg-green-400' : 'bg-purple-400'}`} />
                                    {typeName}
                                  </span>
                                  <span className="font-bold text-slate-100">{count.toLocaleString()}회</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <NoDataAlert message="수집된 전체 기간 동안의 큐브/잠재능력 재설정 기록이 없습니다." />}
                </div>
              )}

              {/* 기존: 경험치 이력 테이블 */}
              {logSubTab === 'exp' && (
                <div className="bg-[#1c1d21] rounded-xl border border-slate-700 overflow-hidden shadow-inner">
                  {generatedExpHistory.length > 0 ? (
                    <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                      <table className="w-full text-left text-sm text-slate-300 border-collapse whitespace-nowrap">
                        <thead className="bg-[#26272b] text-slate-200 border-b border-slate-700 sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="px-5 py-3.5 font-semibold tracking-wide text-xs">날짜</th>
                            <th className="px-5 py-3.5 font-semibold tracking-wide text-xs">요일</th>
                            <th className="px-5 py-3.5 font-semibold tracking-wide text-xs">레벨</th>
                            <th className="px-5 py-3.5 font-semibold tracking-wide text-xs">경험치</th>
                            <th className="px-5 py-3.5 font-semibold tracking-wide text-xs">경험치 %</th>
                            <th className="px-5 py-3.5 font-semibold tracking-wide text-xs">상승 경험치 %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {generatedExpHistory.map((exp, idx) => {
                            const gainedStr = Number(exp.gainedRate.toFixed(3));
                            return (
                              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-5 py-3">{exp.date}</td>
                                <td className="px-5 py-3">{exp.dayOfWeek}</td>
                                <td className="px-5 py-3">{exp.level}</td>
                                <td className="px-5 py-3">{exp.exp.toLocaleString()}</td>
                                <td className="px-5 py-3">{exp.expRate.toFixed(3)}%</td>
                                <td className="px-5 py-3 font-medium">
                                  {exp.isFirst ? <span className="text-slate-500">-</span> : (
                                    <div className="flex items-center">
                                      <span className={exp.gainedRate > 0 ? "text-slate-100" : "text-slate-400"}>
                                        {exp.gainedRate > 0 ? '+' : ''}{gainedStr}%
                                      </span>
                                      {exp.isLevelUp && <span className="ml-2 text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-400 px-1.5 py-0.5 rounded">LEVEL UP</span>}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : <NoDataAlert message="경험치 변동 내역이 없습니다." />}
                </div>
              )}

              {/* 기존: 원본 Raw 로그들 (최근 100건) */}
              {logSubTab === 'logs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* 큐브 로그 */}
                  <div className="bg-[#1e2028] p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">큐브 최근 사용 (100건)</h3>
                    {currentData.historyCube?.cube_history?.length > 0 ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {currentData.historyCube.cube_history.slice(0, 100).map((log, idx) => {
                          const beforeOpts = log.before_potential_option?.length ? log.before_potential_option : log.before_additional_potential_option;
                          const afterOpts = log.after_potential_option?.length ? log.after_potential_option : log.after_additional_potential_option;
                          return (
                            <div key={idx} className="bg-[#181a20] p-2 rounded border border-slate-700/50 text-[10px]">
                              <div className="flex justify-between text-slate-500 mb-1">
                                <span>{log.date_create.replace('T', ' ').substring(0, 16)}</span>
                                <span className="text-orange-400">{log.cube_type}</span>
                              </div>
                              <div className="font-semibold text-slate-300 mb-1">{log.target_item || '알 수 없는 장비'}</div>
                              <div className="flex gap-2">
                                <div className="flex-1 bg-slate-900/50 p-1 rounded"><span className="text-slate-500 block">전</span>{beforeOpts?.map(o => o.value).join(', ') || '-'}</div>
                                <div className="flex-1 bg-slate-900/50 p-1 rounded"><span className="text-cyan-500 block">후</span>{afterOpts?.map(o => o.value).join(', ') || '-'}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <NoDataAlert message="최근 큐브 내역 없음" />}
                  </div>

                  {/* 스타포스 로그 */}
                  <div className="bg-[#1e2028] p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">스타포스 최근 강화 (100건)</h3>
                    {currentData.historyStarforce?.starforce_history?.length > 0 ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {currentData.historyStarforce.starforce_history.slice(0, 100).map((log, idx) => {
                          const isSucc = log.item_upgrade_result === '성공';
                          const isDest = log.item_upgrade_result === '파괴';
                          return (
                            <div key={idx} className={`bg-[#181a20] p-2 rounded border text-[10px] ${isSucc ? 'border-green-500/30' : isDest ? 'border-red-500/50' : 'border-slate-700/50'}`}>
                              <div className="flex justify-between text-slate-500 mb-1">
                                <span>{log.date_create.replace('T', ' ').substring(0, 16)}</span>
                                <span className={isSucc ? 'text-green-400' : isDest ? 'text-red-500' : 'text-slate-400'}>{log.item_upgrade_result}</span>
                              </div>
                              <div className="font-semibold text-slate-300 mb-1 truncate">{log.target_item || '장비명 없음'}</div>
                              <div className="flex justify-center bg-slate-900/50 py-1 rounded text-slate-300">
                                ★{log.before_starforce_count} <ChevronRight className="w-3 h-3 mx-1" /> <span className={isSucc?'text-green-400':''}>★{log.after_starforce_count}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <NoDataAlert message="최근 스타포스 내역 없음" />}
                  </div>

                  {/* 잠재 재설정 로그 */}
                  <div className="bg-[#1e2028] p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">메소 잠재 재설정 (100건)</h3>
                    {currentData.historyPotential?.potential_history?.length > 0 ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {currentData.historyPotential.potential_history.slice(0, 100).map((log, idx) => {
                          const beforeOpts = log.before_potential_option?.length ? log.before_potential_option : log.before_additional_potential_option;
                          const afterOpts = log.after_potential_option?.length ? log.after_potential_option : log.after_additional_potential_option;
                          return (
                            <div key={idx} className="bg-[#181a20] p-2 rounded border border-slate-700/50 text-[10px]">
                              <div className="flex justify-between text-slate-500 mb-1">
                                <span>{log.date_create.replace('T', ' ').substring(0, 16)}</span>
                                <span className="text-purple-400">{log.potential_type}</span>
                              </div>
                              <div className="font-semibold text-slate-300 mb-1">{log.target_item || '장비명 없음'}</div>
                              <div className="flex gap-2">
                                <div className="flex-1 bg-slate-900/50 p-1 rounded"><span className="text-slate-500 block">전</span>{beforeOpts?.map(o => o.value).join(', ') || '-'}</div>
                                <div className="flex-1 bg-slate-900/50 p-1 rounded"><span className="text-cyan-500 block">후</span>{afterOpts?.map(o => o.value).join(', ') || '-'}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <NoDataAlert message="최근 메소 재설정 내역 없음" />}
                  </div>
                </div>
              )}

              {/* 기존: 랭킹 및 무릉 */}
              {logSubTab === 'rank' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-6">
                    <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg text-center">
                      <h3 className="text-xs font-semibold text-slate-500 mb-2">무릉도장 최고 기록</h3>
                      <div className="text-3xl font-black text-white">{currentData.dojang?.dojang_best_floor ? `${currentData.dojang.dojang_best_floor}층` : '-'}</div>
                      <div className="text-xs text-slate-500 mt-2">시간: {currentData.dojang?.dojang_best_time ? `${currentData.dojang.dojang_best_time}초` : '-'}</div>
                    </div>
                  </div>
                  <div className="md:col-span-2 bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">각종 랭킹 순위</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: '종합 랭킹', data: currentData.rankingOverall?.[0] },
                        { name: '유니온 랭킹', data: currentData.rankingUnion?.[0] },
                        { name: '무릉도장 랭킹', data: currentData.rankingDojang?.[0] },
                        { name: '업적 랭킹', data: currentData.rankingAchievement?.[0] }
                      ].map((rk, idx) => (
                        <div key={idx} className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                          <span className="text-[10px] text-slate-500 block mb-1">{rk.name}</span>
                          {rk.data ? <div className="font-bold text-lg text-slate-200">{rk.data.ranking.toLocaleString()}위</div> : <span className="text-xs text-slate-600">기록 없음</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.8); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 1); }
      `}} />
    </div>
  );
}