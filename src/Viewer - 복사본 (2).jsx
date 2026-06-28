import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Calendar, TrendingUp, Swords, Shield, Hexagon, Activity, ChevronRight, Package, User, Sparkles, Crown, Clock, Settings, Zap, Star, AlertCircle, BarChart2, Check, RefreshCw, ArrowRight, Layers, Flame, ArrowUpRight, ArrowDownRight, Flag, Camera, X } from 'lucide-react';

// --- 강력한 안전 필터 (White Screen Crash 완벽 방지) ---
const safeArray = (arr) => Array.isArray(arr) ? arr : [];

// 시즌 판별 헬퍼 함수
const determineSeasonLabel = (dateStr) => {
  if (!dateStr) return "기록 없음";
  const date = new Date(dateStr);
  const s3Start = new Date('2025-12-01');
  const s3End = new Date('2026-04-30');
  const s4Start = new Date('2026-06-01'); 
  const s4End = new Date('2026-10-31');

  if (date >= s3Start && date <= s3End) return '시즌 3';
  if (date >= s4Start && date <= s4End) return '시즌 4';
  return '최신 시즌'; 
};

// 잠재능력 등급별 색상 매핑
const getGradeColor = (grade) => {
  if (!grade) return '#64748b';
  const g = String(grade);
  if (g.includes('레전드리')) return '#16a34a'; // 진한 녹색
  if (g.includes('유니크')) return '#facc15';   // 노랑 계열
  if (g.includes('에픽')) return '#a855f7';     // 보라 계열
  if (g.includes('레어')) return '#60a5fa';     // 연파랑
  return '#94a3b8';
};

export default function App() {
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [season4Data, setSeason4Data] = useState(null); // 기준 (현재)
  const [season3Data, setSeason3Data] = useState(null); // 비교 (과거)
  const [error, setError] = useState('');

  // 날짜(Day) 기반 슬라이더 상태
  const [currentDaySlider, setCurrentDaySlider] = useState(0); 

  const [activeTab, setActiveTab] = useState('overview');
  const [equipSubTab, setEquipSubTab] = useState('item'); 
  const [skillSubTab, setSkillSubTab] = useState('hexa');
  const [logSubTab, setLogSubTab] = useState('compare_rng');
  const [overviewSubTab, setOverviewSubTab] = useState('chart');
  const [raceCategory, setRaceCategory] = useState('level'); 

  const [showReportCard, setShowReportCard] = useState(false);

  const isCompareMode = season3Data !== null && Array.isArray(season3Data) && season3Data.length > 0;

  // 안전한 스탯 파싱
  const getStatValue = (data, statName) => {
    if (!data?.stats?.final_stat || !Array.isArray(data.stats.final_stat)) return '0';
    const stat = data.stats.final_stat.find(s => s?.stat_name === statName);
    return stat ? stat.stat_value : '0';
  };
  const parseStatNum = (str) => Number(String(str).replace(/,/g, '').replace(/%/g, '')) || 0;

  // 인덱스 매칭 및 차트 정규화 로직 (Day 기준 동기화)
  const chartData = useMemo(() => {
    if (!season4Data || !Array.isArray(season4Data) || season4Data.length < 1) return null;
    const getDaysDiff = (start, current) => {
      if (!start || !current) return 0;
      return Math.max(0, Math.floor((new Date(current).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
    };
    
    const s4Start = season4Data[0]?.targetDate;
    const s4Points = safeArray(season4Data).map(d => ({ 
      day: getDaysDiff(s4Start, d?.targetDate), 
      cp: parseStatNum(getStatValue(d, '전투력')), 
      date: d?.targetDate 
    }));

    let s3Points = [];
    if (isCompareMode && season3Data[0]) {
      const s3Start = season3Data[0]?.targetDate;
      s3Points = safeArray(season3Data).map(d => ({ 
        day: getDaysDiff(s3Start, d?.targetDate), 
        cp: parseStatNum(getStatValue(d, '전투력')), 
        date: d?.targetDate 
      }));
    }
    const maxDay = Math.max(s4Points[s4Points.length - 1]?.day || 0, s3Points[s3Points.length - 1]?.day || 0, 1);
    const allCp = [...s4Points.map(p => p.cp), ...s3Points.map(p => p.cp)];
    
    return { 
      s4Points, s3Points, maxDay, 
      maxCp: Math.max(...allCp, 1), 
      minCp: Math.min(...allCp, 0), 
      s4Start, 
      s3Start: isCompareMode ? season3Data[0]?.targetDate : null 
    };
  }, [season4Data, season3Data, isCompareMode]);

  // 데이터 업로드 시 슬라이더를 최대로 자동 세팅
  useEffect(() => {
    if (chartData?.maxDay !== undefined) {
      setCurrentDaySlider(chartData.maxDay);
    }
  }, [chartData?.maxDay]);

  // 슬라이더 Day 값에 해당하는 실제 인덱스 찾기
  const currentS4Index = useMemo(() => {
    if (!chartData?.s4Points) return -1;
    const maxS4Day = chartData.s4Points[chartData.s4Points.length - 1]?.day || 0;
    if (currentDaySlider > maxS4Day) return -1; 
    
    let bestIdx = 0; let minDiff = Infinity;
    chartData.s4Points.forEach((p, i) => { 
      const diff = Math.abs(p.day - currentDaySlider); 
      if (diff <= minDiff) { minDiff = diff; bestIdx = i; } 
    });
    return bestIdx;
  }, [chartData, currentDaySlider]);

  const currentS3Index = useMemo(() => {
    if (!isCompareMode || !chartData?.s3Points) return -1;
    const maxS3Day = chartData.s3Points[chartData.s3Points.length - 1]?.day || 0;
    if (currentDaySlider > maxS3Day) return -1; 
    
    let bestIdx = 0; let minDiff = Infinity;
    chartData.s3Points.forEach((p, i) => { 
      const diff = Math.abs(p.day - currentDaySlider); 
      if (diff <= minDiff) { minDiff = diff; bestIdx = i; } 
    });
    return bestIdx;
  }, [isCompareMode, chartData, currentDaySlider]);

  // 안전하게 현재 렌더링할 데이터 추출
  const currentData = currentS4Index !== -1 ? season4Data?.[currentS4Index] : null;
  const currentData3 = currentS3Index !== -1 && isCompareMode ? season3Data?.[currentS3Index] : null;
  const firstData = season4Data?.[0] || null;
  const firstData3 = isCompareMode ? season3Data?.[0] : null;
  const lastS4Data = season4Data?.[season4Data?.length - 1];
  const lastS3Data = isCompareMode ? season3Data?.[season3Data?.length - 1] : null;
  
  // fallback 적용된 active 데이터 (렌더링 에러 방지용)
  const activeData = currentData || currentData3 || firstData || {};

  const LBL_NOW = useMemo(() => determineSeasonLabel(firstData?.targetDate), [firstData]);
  const LBL_PAST = useMemo(() => determineSeasonLabel(firstData3?.targetDate), [firstData3]);

  const estimatedS4Date = chartData?.s4Start ? new Date(new Date(chartData.s4Start).getTime() + currentDaySlider * 86400000).toISOString().split('T')[0] : '';

  // 마일스톤 생성 로직
  const raceData = useMemo(() => {
    if (!chartData) return { level: [], cp_low: [], cp_mid: [], cp_high: [] };
    
    const getDays = (arr, start, checkFn) => {
      if (!Array.isArray(arr) || !start) return null;
      for (let d of arr) { 
        if (d && checkFn(d)) {
          if (!d?.targetDate) continue;
          return Math.max(0, Math.floor((new Date(d.targetDate).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))); 
        }
      }
      return null;
    };

    const lvMilestones = [260, 265, 270, 275, 280, 285].map(v => ({
      name: `Lv.${v}`, 
      s4: getDays(season4Data, chartData.s4Start, (d) => (d?.basic?.character_level || 0) >= v),
      s3: getDays(season3Data, chartData.s3Start, (d) => (d?.basic?.character_level || 0) >= v)
    }));

    const buildCp = (start, end, step) => {
      const res = [];
      for (let v = start; v <= end; v += step) {
        res.push({
          name: v >= 10000 ? `${Math.floor(v/10000)}억${v%10000 !== 0 ? ` ${(v%10000)}만` : ''}` : `${v}만`,
          s4: getDays(season4Data, chartData.s4Start, (d) => parseStatNum(getStatValue(d, '전투력')) >= v * 10000),
          s3: getDays(season3Data, chartData.s3Start, (d) => parseStatNum(getStatValue(d, '전투력')) >= v * 10000)
        });
      }
      return res;
    };

    return {
      level: lvMilestones,
      cp_low: buildCp(1000, 5000, 1000),    // 1000만 ~ 5000만
      cp_mid: buildCp(5500, 10000, 500),   // 5500만 ~ 1억
      cp_high: buildCp(10500, 13500, 500)  // 1억 500만 ~ 1억 3500만
    };
  }, [chartData, season4Data, season3Data]);

  // 안전한 파일 업로드 핸들러
  const handleFileUpload = (e, seasonType) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        
        if (!dataArray || dataArray.length === 0 || !dataArray[0]) {
          setError('올바른 메이플 데이터북 형식이 아닙니다 (빈 데이터).');
          return;
        }
        if (!dataArray[0].basic && !dataArray[0].targetDate) {
          setError('올바른 메이플 데이터북 형식이 아닙니다 (기본 정보 누락).');
          return;
        }

        dataArray.sort((a, b) => {
          const timeA = a?.targetDate ? new Date(a.targetDate).getTime() : 0;
          const timeB = b?.targetDate ? new Date(b.targetDate).getTime() : 0;
          return timeA - timeB;
        });
        
        if (seasonType === 's4') { 
          setSeason4Data(dataArray); 
        } else { 
          setSeason3Data(dataArray); 
        }
        setError('');
      } catch (err) { 
        setError(`오류 발생: 올바른 JSON 형식이 아닙니다.`); 
      }
    };
    reader.readAsText(file);
  };

  // 강력한 통계 계산 안전 필터 적용
  const calculateSummaries = (dataArr) => {
    if (!Array.isArray(dataArr) || dataArr.length === 0) return { sfSummaryArray: [], cubeSummaryArray: [], totalDestroys: 0, totalCubes: 0 };
    const sfSet = new Set(); const cubeSet = new Set();
    const sfSummary = {}; const cubeSummary = {};
    let totalDestroys = 0; let totalCubes = 0;
    
    dataArr.forEach(data => {
      if(!data) return;
      safeArray(data?.historyStarforce?.starforce_history).forEach(log => {
        if(!log) return;
        const dateStr = log?.date_create ? String(log.date_create) : '';
        const targetItem = log?.target_item || '알 수 없는 장비';
        const beforeStar = log?.before_starforce_count || 0;
        const afterStar = log?.after_starforce_count || 0;
        const result = log?.item_upgrade_result || '';

        const key = `${dateStr}_${targetItem}_${beforeStar}_${result}`;
        if (!sfSet.has(key)) {
          sfSet.add(key);
          if (!sfSummary[targetItem]) {
            sfSummary[targetItem] = { 
              name: targetItem, startStar: beforeStar, endStar: afterStar, 
              totalTries: 0, destroys: 0, success: 0, fail: 0, maxTargetStar: 0, targetStarStats: {}, 
              startDate: dateStr.split('T')[0] || '알 수 없음', endDate: dateStr.split('T')[0] || '알 수 없음' 
            };
          }
          const s = sfSummary[targetItem];
          if (new Date(dateStr) > new Date(s.endDate)) { s.endStar = afterStar; s.endDate = dateStr.split('T')[0] || s.endDate; }
          if (new Date(dateStr) < new Date(s.startDate)) { s.startStar = beforeStar; s.startDate = dateStr.split('T')[0] || s.startDate; }
          s.totalTries++;
          if (result === '성공') s.success++; else if (result === '파괴') { s.destroys++; totalDestroys++; } else s.fail++;
          
          const target = beforeStar + 1;
          if (target > s.maxTargetStar) s.maxTargetStar = target;
          if (!s.targetStarStats[target]) s.targetStarStats[target] = { success: 0, fail: 0, destroy: 0 };
          if (result === '성공') s.targetStarStats[target].success++;
          else if (result === '파괴') s.targetStarStats[target].destroy++;
          else s.targetStarStats[target].fail++;
        }
      });

      safeArray(data?.historyCube?.cube_history).forEach(log => {
        if(!log) return;
        const dateStr = log?.date_create ? String(log.date_create) : '';
        const targetItem = log?.target_item || '알 수 없는 장비';
        const cubeType = log?.cube_type || '알 수 없는 큐브';
        const key = `${dateStr}_${targetItem}_${cubeType}`;
        if (!cubeSet.has(key)) { 
          cubeSet.add(key); totalCubes++; 
          if (!cubeSummary[targetItem]) cubeSummary[targetItem] = { name: targetItem, types: {} }; 
          cubeSummary[targetItem].types[cubeType] = (cubeSummary[targetItem].types[cubeType] || 0) + 1; 
        }
      });

      safeArray(data?.historyPotential?.potential_history).forEach(log => {
        if(!log) return;
        const dateStr = log?.date_create ? String(log.date_create) : '';
        const targetItem = log?.target_item || '알 수 없는 장비';
        const potType = log?.potential_type || '잠재능력 재설정';
        const key = `${dateStr}_${targetItem}_${potType}`;
        if (!cubeSet.has(key)) { 
          cubeSet.add(key); totalCubes++; 
          if (!cubeSummary[targetItem]) cubeSummary[targetItem] = { name: targetItem, types: {} }; 
          cubeSummary[targetItem].types[potType] = (cubeSummary[targetItem].types[potType] || 0) + 1; 
        }
      });
    });
    return { 
      sfSummaryArray: Object.values(sfSummary).sort((a,b)=>b.totalTries - a.totalTries), 
      cubeSummaryArray: Object.values(cubeSummary).sort((a,b)=>{
        const sumA = Object.values(a.types).reduce((acc,v)=>acc+v,0);
        const sumB = Object.values(b.types).reduce((acc,v)=>acc+v,0);
        return sumB - sumA;
      }), 
      totalDestroys, totalCubes 
    };
  };

  const s4Stats = useMemo(() => calculateSummaries(season4Data), [season4Data]);
  const s3Stats = useMemo(() => calculateSummaries(season3Data), [season3Data]);

  const generatedTitle = useMemo(() => {
    if (!firstData) return "챌린저스 개척자";
    let title = "챌린저스 개척자";
    const cp100m = raceData?.cp_mid?.find(m => m.name === '1억');
    
    if (s4Stats.totalDestroys >= 10) title = "펑펑 우는 별의 주인";
    else if (s4Stats.totalCubes >= 1000) title = "잠재능력 중독자";
    else if (cp100m && cp100m.s4 !== null && cp100m.s4 < 30) title = "빛의 속도 마스터";
    else if ((firstData?.basic?.character_level || 0) >= 270) title = "멈추지 않는 수련자";
    else if (isCompareMode && lastS4Data && lastS3Data && parseStatNum(getStatValue(lastS4Data, '전투력')) > parseStatNum(getStatValue(lastS3Data, '전투력')) * 1.5) title = "한계를 초월한 자";
    return title;
  }, [firstData, s4Stats, raceData, isCompareMode, lastS3Data, lastS4Data]);

  const formatAddOption = (addOpt) => {
    if (!addOpt) return null;
    const stats = [];
    if (Number(addOpt?.str) > 0) stats.push(`STR +${addOpt.str}`);
    if (Number(addOpt?.dex) > 0) stats.push(`DEX +${addOpt.dex}`);
    if (Number(addOpt?.int) > 0) stats.push(`INT +${addOpt.int}`);
    if (Number(addOpt?.luk) > 0) stats.push(`LUK +${addOpt.luk}`);
    if (Number(addOpt?.max_hp) > 0) stats.push(`HP +${addOpt.max_hp}`);
    if (Number(addOpt?.attack_power) > 0) stats.push(`공격력 +${addOpt.attack_power}`);
    if (Number(addOpt?.magic_power) > 0) stats.push(`마력 +${addOpt.magic_power}`);
    if (Number(addOpt?.boss_damage) > 0) stats.push(`보공 +${addOpt.boss_damage}%`);
    if (Number(addOpt?.damage) > 0) stats.push(`데미지 +${addOpt.damage}%`);
    if (Number(addOpt?.all_stat) > 0) stats.push(`올스탯 +${addOpt.all_stat}%`);
    return stats.length > 0 ? stats.join(', ') : null;
  };

  const generatedExpHistory = useMemo(() => {
    if (!season4Data || !Array.isArray(season4Data)) return [];
    const history = [];
    const limit = Math.max(-1, currentS4Index);
    for (let i = 0; i <= limit && i < season4Data.length; i++) {
      const data = season4Data[i];
      if (data && data.basic) {
        const currentLevel = data.basic.character_level || 0; 
        const currentExp = Number(data.basic.character_exp) || 0; 
        const currentRate = Number(data.basic.character_exp_rate) || 0;
        let gainedRate = 0; let isLevelUp = false;
        if (i > 0) {
          const prevLevel = season4Data[i - 1]?.basic?.character_level || 0; 
          const prevRate = Number(season4Data[i - 1]?.basic?.character_exp_rate) || 0;
          if (currentLevel === prevLevel) gainedRate = currentRate - prevRate; 
          else if (currentLevel > prevLevel) { isLevelUp = true; gainedRate = (100 - prevRate) + currentRate; }
        }
        const safeDate = data.targetDate ? new Date(data.targetDate) : new Date();
        const dayStr = ['일', '월', '화', '수', '목', '금', '토'][safeDate.getDay()] || '';
        history.push({ date: data.targetDate, dayOfWeek: dayStr, level: currentLevel, exp: currentExp, expRate: currentRate, gainedRate, isLevelUp, isFirst: i === 0 });
      }
    }
    return history.reverse();
  }, [season4Data, currentS4Index]);

  // 장비 렌더링 헬퍼
  const renderItemCard = (item, isNow) => {
    if (!item) return <div className="flex-1 p-4 text-center text-slate-600 text-xs border border-dashed border-slate-800 rounded-lg flex items-center justify-center">해당 부위 장착 안함</div>;
    const addOptText = formatAddOption(item?.item_add_option);
    const hasPot = item?.potential_option_1 || item?.potential_option_2 || item?.potential_option_3;
    const hasAddPot = item?.additional_potential_option_1 || item?.additional_potential_option_2 || item?.additional_potential_option_3;
    
    return (
      <div className="flex-1 flex flex-col gap-3 h-full">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-lg border flex items-center justify-center flex-shrink-0 z-0 ${isNow ? 'bg-slate-900 border-slate-700' : 'bg-slate-800/50 border-slate-700/50'}`}>
            <img src={item?.item_shape_icon} alt="icon" className="w-8 h-8 object-contain z-10 drop-shadow-md" />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className={`text-sm font-bold truncate ${isNow ? 'text-slate-200' : 'text-slate-400'}`}>{item?.item_name}{Number(item?.scroll_upgrade) > 0 && <span className="text-blue-400 ml-1">(+{item?.scroll_upgrade})</span>}</div>
            {item?.starforce && item.starforce !== "0" && <div className={`text-[10px] font-black mt-1 ${isNow ? 'text-yellow-400' : 'text-slate-500'}`}>★ {item.starforce}성</div>}
          </div>
        </div>
        
        <div className="space-y-1.5 flex-1 mt-1">
          {addOptText && (
            <div className={`${isNow ? 'bg-[#a3e635]/10 border-[#a3e635]/30' : 'bg-slate-800/30 border-slate-700/30'} border p-1.5 rounded`}>
              <span className={`text-[9px] font-bold block ${isNow ? 'text-[#a3e635]' : 'text-slate-500'}`}>추가옵션</span>
              <span className={`text-[10px] ${isNow ? 'text-slate-300' : 'text-slate-500'}`}>{addOptText}</span>
            </div>
          )}
          {hasPot && (
            <div className="border p-1.5 rounded" style={{ backgroundColor: isNow ? `${getGradeColor(item?.potential_option_grade)}10` : '', borderColor: isNow ? `${getGradeColor(item?.potential_option_grade)}40` : '#334155' }}>
              <span className="text-[9px] font-bold block" style={{ color: isNow ? getGradeColor(item?.potential_option_grade) : '#64748b' }}>잠재 ({item?.potential_option_grade})</span>
              <ul className={`text-[10px] space-y-0.5 ${isNow ? 'text-slate-300' : 'text-slate-500'}`}>{item?.potential_option_1 && <li>{item.potential_option_1}</li>}{item?.potential_option_2 && <li>{item.potential_option_2}</li>}{item?.potential_option_3 && <li>{item.potential_option_3}</li>}</ul>
            </div>
          )}
          {hasAddPot && (
            <div className="border p-1.5 rounded" style={{ backgroundColor: isNow ? `${getGradeColor(item?.additional_potential_option_grade)}10` : '', borderColor: isNow ? `${getGradeColor(item?.additional_potential_option_grade)}40` : '#334155' }}>
              <span className="text-[9px] font-bold block" style={{ color: isNow ? getGradeColor(item?.additional_potential_option_grade) : '#64748b' }}>에디 ({item?.additional_potential_option_grade})</span>
              <ul className={`text-[10px] space-y-0.5 ${isNow ? 'text-slate-300' : 'text-slate-500'}`}>{item?.additional_potential_option_1 && <li>{item.additional_potential_option_1}</li>}{item?.additional_potential_option_2 && <li>{item.additional_potential_option_2}</li>}{item?.additional_potential_option_3 && <li>{item.additional_potential_option_3}</li>}</ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 뷰어 준비 전 업로드 화면
  if (!isViewerReady) {
    return (
      <div className="min-h-screen bg-[#111318] flex flex-col items-center justify-center p-6 text-slate-200 font-sans relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="max-w-4xl w-full space-y-10 relative z-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-4 shadow-xl">
              <Activity className="w-8 h-8 text-orange-500 mr-3" />
              <h1 className="text-3xl font-black text-white tracking-tight">Challengers Viewer <span className="text-orange-500 text-lg align-top ml-1">PRO</span></h1>
            </div>
            <p className="text-slate-400 text-sm">저장해둔 JSON 파일을 업로드하세요. 두 시즌을 올리면 <strong className="text-white">비교 분석 모드</strong>가 활성화됩니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className={`relative p-8 rounded-3xl border-2 transition-all duration-500 shadow-2xl flex flex-col items-center text-center group overflow-hidden ${season4Data ? 'bg-gradient-to-b from-orange-900/20 to-slate-900 border-orange-500/50' : 'bg-slate-800/50 border-slate-700 border-dashed hover:border-orange-500/30'}`}>
              {season4Data && <div className="absolute top-4 right-4 bg-green-500 text-slate-900 p-1.5 rounded-full shadow-lg shadow-green-500/20"><Check className="w-4 h-4 font-bold" /></div>}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${season4Data ? 'bg-orange-500/20' : 'bg-slate-700'}`}>
                {season4Data ? <img src={season4Data[0]?.basic?.character_image} alt="캐릭터" className="max-w-[80%] max-h-[80%] object-contain drop-shadow-lg" /> : <Upload className="w-8 h-8 text-slate-400" />}
              </div>
              <h2 className="text-lg font-bold text-white mb-2">최신 데이터 (필수)</h2>
              {season4Data ? (
                <div className="space-y-1 mb-6">
                  <p className="text-orange-400 font-bold">{season4Data[0]?.basic?.character_name || '이름 없음'} <span className="text-slate-400 font-normal ml-1">Lv.{season4Data[0]?.basic?.character_level || '?'}</span></p>
                  <p className="text-xs text-slate-500">{season4Data[0]?.targetDate || '?'} ~ {season4Data[season4Data.length-1]?.targetDate || '?'}</p>
                  <div className="mt-4 text-orange-400 text-xs font-bold">[{determineSeasonLabel(season4Data[0]?.targetDate)}] 업로드됨</div>
                </div>
              ) : <p className="text-xs text-slate-400 mb-6">현재 수집한 최신<br/>데이터북 파일을 올려주세요.</p>}
              <label className="w-full cursor-pointer bg-slate-700 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                <span>{season4Data ? '파일 다시 선택' : '파일 선택'}</span>
                <input type="file" accept=".json" onChange={e => handleFileUpload(e, 's4')} className="hidden" />
              </label>
            </div>

            <div className={`relative p-8 rounded-3xl border-2 transition-all duration-500 shadow-2xl flex flex-col items-center text-center group overflow-hidden ${!season4Data ? 'opacity-50 grayscale pointer-events-none' : ''} ${season3Data ? 'bg-gradient-to-b from-blue-900/20 to-slate-900 border-blue-500/50' : 'bg-slate-800/50 border-slate-700 border-dashed hover:border-blue-500/30'}`}>
              {season3Data && <div className="absolute top-4 right-4 bg-green-500 text-slate-900 p-1.5 rounded-full shadow-lg shadow-green-500/20"><Check className="w-4 h-4 font-bold" /></div>}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${season3Data ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                {season3Data ? <img src={season3Data[0]?.basic?.character_image} alt="캐릭터" className="max-w-[80%] max-h-[80%] object-contain drop-shadow-lg" /> : <Layers className="w-8 h-8 text-slate-400" />}
              </div>
              <h2 className="text-lg font-bold text-white mb-2">과거 시즌 데이터 (선택)</h2>
              {season3Data ? (
                <div className="space-y-1 mb-6">
                  <p className="text-blue-400 font-bold">{season3Data[0]?.basic?.character_name || '이름 없음'} <span className="text-slate-400 font-normal ml-1">Lv.{season3Data[0]?.basic?.character_level || '?'}</span></p>
                  <p className="text-xs text-slate-500">{season3Data[0]?.targetDate || '?'} ~ {season3Data[season3Data.length-1]?.targetDate || '?'}</p>
                  <div className="mt-4 text-blue-400 text-xs font-bold">[{determineSeasonLabel(season3Data[0]?.targetDate)}] 업로드됨</div>
                </div>
              ) : <p className="text-xs text-slate-400 mb-6">비교할 과거 시즌의<br/>데이터북 파일이 있다면 올려주세요.</p>}
              <label className="w-full cursor-pointer bg-slate-700 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                <span>{season3Data ? '파일 다시 선택' : '파일 선택'}</span>
                <input type="file" accept=".json" onChange={e => handleFileUpload(e, 's3')} className="hidden" />
              </label>
            </div>
          </div>
          <div className="min-h-[40px]">
            {error && <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-300 rounded-xl flex justify-center text-sm"><AlertCircle className="w-4 h-4 mr-2" /> {error}</div>}
          </div>
          <button onClick={() => setIsViewerReady(true)} disabled={!season4Data} className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center transition-all duration-300 shadow-2xl ${!season4Data ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : season3Data ? 'bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-500 hover:to-blue-500 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}>
            {season3Data ? <><RefreshCw className="w-6 h-6 mr-3" /> 🔥 시즌 비교 분석 모드 시작하기</> : <><ArrowRight className="w-6 h-6 mr-3" /> 단일 뷰 모드 시작하기</>}
          </button>
        </div>
      </div>
    );
  }

  const NoDataAlert = ({ message }) => (
    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700"><AlertCircle className="w-8 h-8 mb-3 opacity-50" /><p className="text-sm">{message || "데이터가 존재하지 않거나 수집되지 않았습니다."}</p></div>
  );

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 font-sans pb-20 relative">
      
      {/* ============================================================== */}
      {/* 챌린저스 성적표 (Report Card) 모달 오버레이 */}
      {/* ============================================================== */}
      {showReportCard && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <button onClick={() => setShowReportCard(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          <div className="text-center mb-4 space-y-2">
            <h2 className="text-xl font-bold text-white flex items-center justify-center"><Camera className="w-5 h-5 mr-2" /> 스크린샷 캡처용 성적표</h2>
            <p className="text-xs text-slate-400">Windows: <kbd className="bg-slate-800 px-1 rounded">Win</kbd> + <kbd className="bg-slate-800 px-1 rounded">Shift</kbd> + <kbd className="bg-slate-800 px-1 rounded">S</kbd> / Mac: <kbd className="bg-slate-800 px-1 rounded">Cmd</kbd> + <kbd className="bg-slate-800 px-1 rounded">Shift</kbd> + <kbd className="bg-slate-800 px-1 rounded">4</kbd></p>
          </div>
          <div id="report-card-capture" className="w-[400px] bg-gradient-to-b from-slate-900 to-[#0b0c10] rounded-3xl border-2 border-slate-700 shadow-[0_0_50px_rgba(249,115,22,0.15)] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="p-8 pb-4 text-center border-b border-slate-800">
              <div className="w-24 h-24 mx-auto bg-slate-800 rounded-full border-4 border-slate-700 shadow-xl overflow-hidden mb-4 relative flex items-center justify-center">
                <img src={firstData?.basic?.character_image} alt="캐릭터" className="w-20 h-20 object-contain relative z-10 drop-shadow-md" />
              </div>
              <div className="text-xs text-orange-400 font-black tracking-widest mb-1">[{generatedTitle}]</div>
              <h2 className="text-3xl font-black text-white tracking-tight">{firstData?.basic?.character_name}</h2>
              <div className="text-xs text-slate-500 mt-2">{firstData?.basic?.world_name} • {firstData?.basic?.character_class}</div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">최종 달성 전투력</div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
                  {lastS4Data ? Number(getStatValue(lastS4Data, '전투력')).toLocaleString() : '0'}
                </div>
                {isCompareMode && lastS3Data && lastS4Data && (
                  <div className="text-xs text-slate-400 mt-1">과거 시즌 대비 <span className="text-green-400 font-bold">+{ (Number(getStatValue(lastS4Data, '전투력')) - Number(getStatValue(lastS3Data, '전투력'))).toLocaleString() }</span></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700 text-center"><div className="text-[10px] text-slate-500 mb-1">최종 레벨</div><div className="text-xl font-bold text-white">Lv.{lastS4Data?.basic?.character_level || '?'}</div></div>
                <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700 text-center"><div className="text-[10px] text-slate-500 mb-1">최고 무릉</div><div className="text-xl font-bold text-white">{lastS4Data?.dojang?.dojang_best_floor || 0}층</div></div>
                <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700 text-center"><div className="text-[10px] text-slate-500 mb-1">누적 큐브</div><div className="text-xl font-bold text-white">{s4Stats.totalCubes.toLocaleString()}개</div></div>
                <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700 text-center"><div className="text-[10px] text-slate-500 mb-1">장비 파괴</div><div className="text-xl font-bold text-red-400">{s4Stats.totalDestroys}번</div></div>
              </div>
            </div>
            <div className="p-4 bg-black/40 text-center text-[10px] text-slate-600 font-mono tracking-wider border-t border-slate-800">CHALLENGERS VIEWER PRO • ARCHIVE</div>
          </div>
        </div>
      )}

      {/* 상단바 및 타임라인 컨트롤 */}
      <div className="bg-[#181a20] border-b border-slate-800 sticky top-0 z-50 shadow-lg px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Activity className="w-6 h-6 text-orange-500 flex-shrink-0" />
          <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">Challengers Viewer <span className="text-orange-500 text-xs font-black">PRO</span></h1>
        </div>
        
        {chartData && (
          <div className="flex-1 max-w-2xl w-full flex flex-col sm:flex-row items-center gap-3 px-4">
            <div className="flex items-center space-x-2 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700 w-full sm:w-auto shrink-0">
              <Calendar className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <input 
                type="date" 
                value={estimatedS4Date} 
                min={chartData?.s4Start} 
                max={lastS4Data?.targetDate}
                onChange={(e) => {
                  if(!e.target.value) return; 
                  const selectedTime = new Date(e.target.value).getTime();
                  const startTime = new Date(chartData.s4Start).getTime();
                  const diffDay = Math.max(0, Math.floor((selectedTime - startTime) / (1000 * 60 * 60 * 24)));
                  setCurrentDaySlider(Math.min(diffDay, chartData.maxDay));
                }}
                className="bg-transparent text-orange-400 font-bold text-sm focus:outline-none [color-scheme:dark] cursor-pointer w-full"
              />
            </div>
            <div className="flex-1 w-full flex items-center space-x-3 relative">
              <span className="text-xs text-slate-500 whitespace-nowrap font-bold">Day 0</span>
              <input type="range" min="0" max={chartData?.maxDay || 100} value={currentDaySlider} onChange={e => setCurrentDaySlider(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              <span className="text-xs text-slate-500 whitespace-nowrap font-bold">Day {chartData?.maxDay || 0}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button onClick={() => setShowReportCard(true)} className="flex items-center text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-1.5 rounded-lg shadow-lg hover:opacity-90 whitespace-nowrap"><Camera className="w-4 h-4 mr-2" /> 성적표</button>
          <button onClick={() => setIsViewerReady(false)} className="text-sm text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg whitespace-nowrap">닫기</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        {/* 캐릭터 정보 좌우 비교 */}
        <div className={`grid grid-cols-1 ${isCompareMode ? 'md:grid-cols-2' : ''} gap-6`}>
          {isCompareMode && (
            <div className="bg-[#1e2028] rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 border border-slate-800 shadow-xl relative overflow-hidden group min-h-[160px]">
              <div className="absolute top-3 left-4 text-[10px] font-black text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-500/30 z-20 shadow-sm">{LBL_PAST}</div>
              
              {currentData3 ? (
                <>
                  <div className="relative w-24 h-24 bg-[#181a20] rounded-2xl border border-slate-700 flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden mt-6 md:mt-0 z-10">
                    <div className="absolute inset-0 bg-blue-500/5"></div>
                    <img src={currentData3?.basic?.character_image} alt="캐릭터" className="max-w-full max-h-full object-contain relative z-10" />
                  </div>
                  <div className="flex-1 text-center md:text-left pt-2 z-10">
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-[10px] text-slate-400">{currentData3?.basic?.character_class}</span>
                      <span className="px-2 py-0.5 text-blue-400 border border-blue-700/50 bg-blue-900/20 rounded-full text-[10px] font-bold">조회일: {currentData3?.targetDate} (Day {currentDaySlider})</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-200">{currentData3?.basic?.character_name}</h2>
                    <div className="flex justify-center md:justify-start gap-4 mt-2">
                       <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase">Lv</span><span className="text-md font-bold text-blue-400">{currentData3?.basic?.character_level}</span></div>
                       <div className="flex flex-col"><span className="text-[9px] text-slate-500 uppercase">CP</span><span className="text-md font-bold text-blue-400">{Number(getStatValue(currentData3, '전투력')).toLocaleString()}</span></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-slate-600">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-bold">해당 일차의 {LBL_PAST} 데이터가 없습니다.</p>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-[#1e2028] rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 border border-slate-800 shadow-xl relative overflow-hidden group min-h-[160px]">
            <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            {isCompareMode && <div className="absolute top-3 left-4 text-[10px] font-black text-orange-400 bg-orange-900/50 px-2 py-0.5 rounded border border-orange-500/30 z-20 shadow-sm">{LBL_NOW}</div>}
            
            {currentData ? (
              <>
                <div className="relative w-24 h-24 bg-[#181a20] rounded-2xl border border-slate-700 flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden mt-6 md:mt-0 z-10">
                  <div className="absolute inset-0 bg-orange-500/5"></div>
                  <img src={currentData?.basic?.character_image} alt="캐릭터" className="max-w-full max-h-full object-contain relative z-10" />
                </div>
                <div className="flex-1 text-center md:text-left pt-2 z-10">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-slate-400 mb-2">
                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full">{currentData?.basic?.world_name}</span>
                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full">{currentData?.basic?.character_class}</span>
                    <span className="px-2 py-0.5 text-orange-400 border border-orange-700/50 bg-orange-900/20 rounded-full text-[10px] font-bold">조회일: {currentData?.targetDate} (Day {currentDaySlider})</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
                    {currentData?.basic?.character_name}
                    {currentData?.title?.title_name && <span className="text-sm font-normal text-yellow-400 ml-3">[{currentData.title.title_name}]</span>}
                  </h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                     <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase">Level</span><span className="text-lg font-bold text-orange-400">{currentData?.basic?.character_level}</span></div>
                     <div className="w-px bg-slate-700"></div>
                     <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase">Combat Power</span><span className="text-lg font-bold text-orange-400">{Number(getStatValue(currentData, '전투력')).toLocaleString()}</span></div>
                     <div className="w-px bg-slate-700"></div>
                     <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase">Union</span><span className="text-lg font-bold text-orange-400">{currentData?.union?.union_level || 0}</span></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full text-slate-600">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-bold">해당 일차의 {LBL_NOW} 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 메인 탭 메뉴 */}
        <div className="flex space-x-1 border-b border-slate-800 overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', icon: TrendingUp, label: isCompareMode ? '타임라인 비교' : '타임라인' },
            { id: 'character', icon: User, label: '캐릭터 정보' },
            { id: 'stats', icon: Swords, label: '스탯 상세 비교' },
            { id: 'equipment', icon: Package, label: '장비' },
            { id: 'skills', icon: Hexagon, label: '스킬' },
            { id: 'union', icon: Crown, label: '통계/로그' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-6 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-orange-500 text-orange-400 bg-orange-500/5' : 'border-transparent text-slate-500 hover:text-slate-200'}`}>
              <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in duration-300">
          {/* ======================= OVERVIEW TAB ======================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex space-x-2">
                <button onClick={() => setOverviewSubTab('chart')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${overviewSubTab === 'chart' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}>📈 전투력 타임라인</button>
                {isCompareMode && <button onClick={() => setOverviewSubTab('race')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center ${overviewSubTab === 'race' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'}`}><Flag className="w-3 h-3 mr-1"/> 마일스톤 성장 레이스</button>}
              </div>

              {overviewSubTab === 'chart' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
                    <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full blur-xl pointer-events-none"></div>
                      <h3 className="text-sm font-bold text-orange-400 mb-4 flex items-center"><Activity className="w-4 h-4 mr-2" /> [{LBL_NOW}] 누적 성장</h3>
                      <div className="space-y-4 relative z-10">
                        <div className="flex justify-between text-xs text-slate-500 mb-2 border-b border-slate-700/50 pb-2"><span>최초 ({firstData?.targetDate})</span><span>현재 ({currentData?.targetDate || '기록 없음'})</span></div>
                        {[
                          { label: '레벨', old: firstData?.basic?.character_level || 0, curr: currentData?.basic?.character_level || 0 },
                          { label: '전투력', old: parseStatNum(getStatValue(firstData, '전투력')), curr: parseStatNum(getStatValue(currentData, '전투력')) }
                        ].map((comp, idx) => (
                          <div key={idx} className="bg-[#181a20] p-4 rounded-xl border border-slate-700/30 relative overflow-hidden">
                            <span className="text-xs text-slate-400 block mb-1">{comp.label}</span>
                            <div className="flex items-center justify-between"><span className="text-sm text-slate-500 line-through">{comp.old.toLocaleString()}</span><ChevronRight className="w-4 h-4 text-slate-600" /><span className="text-lg font-bold text-orange-400">{comp.curr.toLocaleString()}</span></div>
                            {comp.curr - comp.old > 0 && <div className="absolute right-4 top-2 text-[10px] text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded font-bold">+{ (comp.curr - comp.old).toLocaleString() }</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                    {isCompareMode && firstData3 && (
                      <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full blur-xl pointer-events-none"></div>
                        <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center"><Layers className="w-4 h-4 mr-2" /> [{LBL_PAST}] 누적 성장</h3>
                        <div className="space-y-4 relative z-10">
                          <div className="flex justify-between text-xs text-slate-500 mb-2 border-b border-slate-700/50 pb-2"><span>최초 ({firstData3?.targetDate})</span><span>현재 ({currentData3?.targetDate || '기록 없음'})</span></div>
                          {[
                            { label: '레벨', old: firstData3?.basic?.character_level || 0, curr: currentData3?.basic?.character_level || 0 },
                            { label: '전투력', old: parseStatNum(getStatValue(firstData3, '전투력')), curr: parseStatNum(getStatValue(currentData3, '전투력')) }
                          ].map((comp, idx) => (
                            <div key={idx} className="bg-[#181a20] p-4 rounded-xl border border-slate-700/30 relative overflow-hidden opacity-80">
                              <span className="text-xs text-slate-400 block mb-1">{comp.label}</span>
                              <div className="flex items-center justify-between"><span className="text-sm text-slate-500 line-through">{comp.old.toLocaleString()}</span><ChevronRight className="w-4 h-4 text-slate-600" /><span className="text-lg font-bold text-blue-400">{comp.curr.toLocaleString()}</span></div>
                              {comp.curr - comp.old > 0 && <div className="absolute right-4 top-2 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold">+{ (comp.curr - comp.old).toLocaleString() }</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-2 bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8 z-10 relative">
                      <h3 className="text-sm font-semibold text-slate-300 flex items-center"><TrendingUp className="w-4 h-4 mr-2" /> 전투력 변화 추이 (Day 기준 동기화)</h3>
                      <div className="flex flex-col items-end space-y-1 bg-[#181a20] p-3 rounded-lg border border-slate-700 shadow-md">
                        <div className="text-[10px] text-slate-500 mb-1 border-b border-slate-700 pb-1 w-full text-right font-bold">Day {currentDaySlider} 기준</div>
                        <div className="flex items-center text-orange-400 font-bold text-sm">
                          <span className="w-3 h-3 bg-orange-500 rounded-full mr-2 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
                          {LBL_NOW}: {currentData ? parseStatNum(getStatValue(currentData, '전투력')).toLocaleString() : '공백'}
                        </div>
                        {isCompareMode && (
                          <div className="flex items-center text-blue-400 font-bold text-sm">
                            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                            {LBL_PAST}: {currentData3 ? parseStatNum(getStatValue(currentData3, '전투력')).toLocaleString() : '공백'}
                          </div>
                        )}
                        {isCompareMode && currentData && currentData3 && (
                          <div className="text-xs text-slate-300 pt-1 mt-1 border-t border-slate-700/50">
                            격차: <span className={parseStatNum(getStatValue(currentData, '전투력')) >= parseStatNum(getStatValue(currentData3, '전투력')) ? 'text-green-400' : 'text-red-400'}>{parseStatNum(getStatValue(currentData, '전투력')) >= parseStatNum(getStatValue(currentData3, '전투력')) ? '+' : ''}{(parseStatNum(getStatValue(currentData, '전투력')) - parseStatNum(getStatValue(currentData3, '전투력'))).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {chartData && (chartData.s4Points.length > 1 || chartData.s3Points.length > 1) ? (
                      <div className="flex-1 relative min-h-[350px] w-full">
                        <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-[10px] text-slate-500 border-r border-slate-700 pr-2 pb-2 text-right"><span>{chartData.maxCp.toLocaleString()}</span><span>{chartData.minCp.toLocaleString()}</span></div>
                        <div className="absolute left-16 right-0 top-0 bottom-6">
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                            <defs>
                              <linearGradient id="gradientCp4" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#f97316" /></linearGradient>
                              <linearGradient id="gradientCp3" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
                            </defs>
                            {isCompareMode && <polyline fill="none" stroke="url(#gradientCp3)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.8" points={chartData.s3Points.map(p => `${(p.day / chartData.maxDay) * 100},${chartData.maxCp === chartData.minCp ? 50 : 100 - ((p.cp - chartData.minCp) / (chartData.maxCp - chartData.minCp)) * 100}`).join(' ')} />}
                            <polyline fill="none" stroke="url(#gradientCp4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={chartData.s4Points.map(p => `${(p.day / chartData.maxDay) * 100},${chartData.maxCp === chartData.minCp ? 50 : 100 - ((p.cp - chartData.minCp) / (chartData.maxCp - chartData.minCp)) * 100}`).join(' ')} />
                          </svg>
                          
                          {/* 슬라이더 마커 */}
                          {isCompareMode && currentData3 && chartData?.s3Points?.[currentS3Index] && <div className="absolute w-3 h-3 bg-blue-500 rounded-full border border-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-300 opacity-80" style={{ left: `${(chartData.s3Points[currentS3Index].day / chartData.maxDay) * 100}%`, top: `${chartData.maxCp === chartData.minCp ? 50 : 100 - ((chartData.s3Points[currentS3Index].cp - chartData.minCp) / (chartData.maxCp - chartData.minCp)) * 100}%`, transform: 'translate(-50%, -50%)' }} />}
                          {currentData && chartData?.s4Points?.[currentS4Index] && <div className="absolute w-4 h-4 bg-orange-500 rounded-full border-2 border-slate-900 shadow-[0_0_12px_rgba(249,115,22,1)] transition-all duration-300 z-10" style={{ left: `${(chartData.s4Points[currentS4Index].day / chartData.maxDay) * 100}%`, top: `${chartData.maxCp === chartData.minCp ? 50 : 100 - ((chartData.s4Points[currentS4Index].cp - chartData.minCp) / (chartData.maxCp - chartData.minCp)) * 100}%`, transform: 'translate(-50%, -50%)' }} />}
                        </div>
                        <div className="absolute left-16 right-0 bottom-0 h-6 flex justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-700 font-bold"><span>Day 0</span><span>Day {chartData.maxDay}</span></div>
                      </div>
                    ) : <div className="flex-1 flex items-center justify-center text-slate-500 text-sm bg-slate-800/30 rounded-xl">데이터가 충분하지 않아 차트를 생성할 수 없습니다.</div>}
                  </div>
                </div>
              )}

              {overviewSubTab === 'race' && isCompareMode && (
                <div className="bg-[#1e2028] p-8 rounded-2xl border border-slate-800 shadow-lg space-y-8">
                  <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
                    {[
                      {id:'level', lbl:'캐릭터 레벨'}, {id:'cp_low', lbl:'CP (~5천만)'}, {id:'cp_mid', lbl:'CP (~1억)'}, {id:'cp_high', lbl:'CP (1억~)'}
                    ].map(cat => (
                      <button key={cat.id} onClick={() => setRaceCategory(cat.id)} className={`px-4 py-1.5 text-xs font-black rounded-full transition ${(raceData?.[cat.id] || []).length === 0 ? 'hidden' : ''} ${raceCategory === cat.id ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{cat.lbl}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
                    {safeArray(raceData?.[raceCategory]).map((m, idx) => {
                      const maxVal = Math.max(m?.s4 || 0, m?.s3 || 0, 30);
                      const renderBar = (days, isNow) => {
                        const width = days !== null ? Math.max(12, (days / maxVal) * 100) : 0;
                        const isTooSmall = width < 25;
                        return (
                          <div className="flex items-center gap-2">
                            <span className={`w-14 text-[9px] font-bold ${isNow ? 'text-orange-400' : 'text-blue-400'}`}>{isNow ? LBL_NOW : LBL_PAST}</span>
                            <div className="flex-1 bg-slate-900 h-6 rounded-full relative overflow-visible border border-slate-800 shadow-inner flex items-center">
                              {days !== null ? (
                                <>
                                  <div className={`h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-2 ${isNow ? 'bg-gradient-to-r from-orange-600 to-orange-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} style={{ width: `${width}%` }}>
                                    {!isTooSmall && <span className="text-[10px] font-black text-white">{days}일차</span>}
                                  </div>
                                  {isTooSmall && <span className="text-[10px] font-black text-slate-400 ml-2 whitespace-nowrap">{days}일차</span>}
                                </>
                              ) : <span className="px-3 text-[10px] text-slate-700">미달성</span>}
                            </div>
                          </div>
                        );
                      };
                      return (
                        <div key={idx} className="space-y-2 p-4 bg-slate-900/30 rounded-xl border border-slate-800/50 relative">
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-xs font-black text-slate-300">{m?.name}</span>
                             {m?.s4 !== null && m?.s3 !== null && <span className={`text-[10px] font-bold ${m.s4 <= m.s3 ? 'text-green-400' : 'text-red-400'}`}>{Math.abs(m.s4-m.s3)}일 {m.s4 <= m.s3 ? '단축!' : '지연'}</span>}
                           </div>
                           {renderBar(m?.s3, false)}
                           {renderBar(m?.s4, true)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= CHARACTER TAB ======================= */}
          {activeTab === 'character' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Sparkles className="w-4 h-4 mr-2 text-pink-400" /> 뷰티 및 외형</h3>
                {activeData?.beauty ? (
                  <div className="space-y-4">
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">헤어</span>
                      <div className="font-semibold text-slate-200">{activeData.beauty?.character_hair?.hair_name || '기본 헤어'}</div>
                      {activeData.beauty?.character_hair?.mix_color && (
                        <div className="text-xs text-pink-300 mt-1">믹스: {activeData.beauty.character_hair.base_color} + {activeData.beauty.character_hair.mix_color} ({activeData.beauty.character_hair.mix_rate}%)</div>
                      )}
                    </div>
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">성형</span>
                      <div className="font-semibold text-slate-200">{activeData.beauty?.character_face?.face_name || '기본 성형'}</div>
                      {activeData.beauty?.character_face?.mix_color && (
                        <div className="text-xs text-pink-300 mt-1">믹스: {activeData.beauty.character_face.base_color} + {activeData.beauty.character_face.mix_color} ({activeData.beauty.character_face.mix_rate}%)</div>
                      )}
                    </div>
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">피부</span>
                      <div className="font-semibold text-slate-200">{activeData.beauty?.character_skin_name || '기본 피부'}</div>
                    </div>
                  </div>
                ) : <NoDataAlert message="뷰티 데이터가 없습니다." />}
              </div>
              <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Star className="w-4 h-4 mr-2 text-yellow-400" /> 성향</h3>
                {activeData?.propensity ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[ 
                      { name: '카리스마', lv: activeData.propensity.charisma_level }, 
                      { name: '감성', lv: activeData.propensity.sensibility_level }, 
                      { name: '통찰력', lv: activeData.propensity.insight_level }, 
                      { name: '의지', lv: activeData.propensity.willingness_level }, 
                      { name: '손재주', lv: activeData.propensity.handicraft_level }, 
                      { name: '매력', lv: activeData.propensity.charm_level } 
                    ].map((prop, idx) => (
                      <div key={idx} className="bg-[#181a20] p-3 rounded-lg border border-slate-700/50 text-center"><span className="text-xs text-slate-400 block mb-1">{prop.name}</span><span className="text-lg font-bold text-slate-200">Lv.{prop.lv || 0}</span></div>
                    ))}
                  </div>
                ) : <NoDataAlert message="성향 데이터가 없습니다." />}
              </div>
              <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Shield className="w-4 h-4 mr-2 text-indigo-400" /> 길드 및 커뮤니티</h3>
                <div className="space-y-4">
                  {activeData?.guild ? (
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 block mb-1">소속 길드</span>
                      <div className="flex justify-between items-end"><span className="font-semibold text-lg text-indigo-300">{activeData.guild.guild_name}</span><span className="text-xs text-slate-400">Lv.{activeData.guild.guild_level}</span></div>
                      <div className="text-xs text-slate-400 mt-2">마스터: {activeData.guild.guild_master_name}</div>
                    </div>
                  ) : <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50 text-slate-500 text-sm">길드 없음</div>}
                  <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50 flex justify-between items-center"><span className="text-xs text-slate-400">인기도</span><span className="font-bold text-slate-200">{activeData?.popularity?.popularity || 0}</span></div>
                  {activeData?.title?.title_name && (
                    <div className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50"><span className="text-[10px] text-slate-500 block mb-1">착용 칭호</span><span className="font-bold text-yellow-400 text-sm">{activeData.title.title_name}</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================= STATS TAB ======================= */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <div className="flex justify-between items-center mb-6 px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-800">
                  {isCompareMode ? (
                    <>
                      <div className="flex items-center gap-4 text-xs font-black">
                        <span className="text-blue-400">● {LBL_PAST} (좌측 값)</span>
                        <span className="text-slate-600">VS</span>
                        <span className="text-orange-400">● {LBL_NOW} (우측 값)</span>
                      </div>
                      <div className="text-[10px] text-slate-500">* 수치가 상승한 경우 <span className="text-green-400">초록색</span>으로 강조됩니다.</div>
                    </>
                  ) : (
                    <div className="flex items-center gap-4 text-xs font-black"><span className="text-orange-400">● {LBL_NOW} 스탯</span></div>
                  )}
                </div>
                
                {isCompareMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {['전투력', '최대 HP', 'STR', 'DEX', 'INT', 'LUK', '공격력', '마력', '보스 몬스터 데미지', '방어율 무시', '크리티컬 데미지', '크리티컬 확률', '스타포스', '아케인포스', '어센틱포스'].map(statName => {
                      const v4 = currentData ? getStatValue(currentData, statName) : '0'; 
                      const v3 = currentData3 ? getStatValue(currentData3, statName) : '0';
                      const n4 = parseStatNum(v4); const n3 = parseStatNum(v3);
                      const isBetter = n4 > n3; const isWorse = n4 < n3;
                      if(n3 === 0 && n4 === 0) return null;
                      return (
                        <div key={statName} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isBetter ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-900/30 border-slate-800'}`}>
                          <span className="text-xs text-slate-500 w-24 font-bold truncate">{statName}</span>
                          <span className="text-xs text-blue-300 opacity-60 w-20 text-center line-through">{currentData3 ? v3 : '-'}</span>
                          <ChevronRight className="w-3 h-3 text-slate-700" />
                          <span className={`text-sm font-black w-28 text-right ${isBetter ? 'text-green-400' : isWorse ? 'text-red-400' : 'text-slate-300'}`}>{currentData ? v4 : '-'} {isBetter && <span className="text-[9px] ml-1 text-green-500/80">(+{ (n4-n3).toLocaleString() })</span>}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {safeArray(currentData?.stats?.final_stat).map((stat, idx) => (
                      <div key={idx} className="bg-[#181a20] px-3 py-2 rounded-lg border border-slate-700/30 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-500 mb-0.5 truncate" title={stat?.stat_name}>{stat?.stat_name}</span>
                        <span className="font-semibold text-slate-200 text-sm">{isNaN(Number(stat?.stat_value)) || String(stat?.stat_value).includes('%') ? stat?.stat_value : Number(stat?.stat_value).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Zap className="w-4 h-4 mr-2 text-yellow-400" /> 어빌리티</h3>
                  {activeData?.ability?.ability_info ? (() => {
                    const actAbil = activeData.ability;
                    return (
                      <div>
                        <span className="text-xs bg-[#181a20] px-2 py-1 rounded text-slate-300 mb-3 inline-block border border-slate-700">등급: {actAbil.ability_grade}</span>
                        <ul className="space-y-2">
                          {safeArray(actAbil.ability_info).map((abil, idx) => (
                            <li key={idx} className="text-sm text-slate-300 flex items-start bg-[#181a20] p-3 rounded-lg border border-slate-700/50">
                              <span className="text-orange-400 mr-2 mt-0.5">▪</span> <span className="leading-tight">{abil.ability_value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })() : <NoDataAlert message="어빌리티 데이터 없음" />}
                </div>
                <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-green-400" /> 하이퍼 스탯</h3>
                  {activeData?.hyperStat ? (() => {
                    const actHyper = activeData.hyperStat;
                    return (
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {safeArray(actHyper.hyper_stat_preset_1).filter(h => h.stat_level > 0).map((hs, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm bg-[#181a20] px-3 py-2 rounded-lg">
                            <span className="text-slate-400">{hs.stat_type}</span>
                            <span className="font-bold text-green-400">Lv.{hs.stat_level}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })() : <NoDataAlert message="하이퍼스탯 데이터 없음" />}
                </div>
              </div>
            </div>
          )}

          {/* ======================= EQUIPMENT TAB ======================= */}
          {activeTab === 'equipment' && (
            <div className="space-y-6">
              <div className="flex space-x-2 border-b border-slate-800 pb-2">
                {[ { id: 'item', label: '장착 아이템 (비교 지원)' }, { id: 'cash', label: '캐시 장비' }, { id: 'pet', label: '펫/안드로이드' }, { id: 'symbol', label: '심볼' }, { id: 'set', label: '세트 효과' } ].map(st => (
                  <button key={st.id} onClick={() => setEquipSubTab(st.id)} className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${equipSubTab === st.id ? 'bg-orange-600 text-white' : 'bg-[#181a20] text-slate-400 hover:bg-slate-700'}`}>{st.label}</button>
                ))}
              </div>
              
              {equipSubTab === 'item' && (
                <div className={`grid grid-cols-1 ${isCompareMode ? 'lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
                  {(() => {
                     // 현재와 과거 장비 중 하나라도 있는 모든 부위 통합 리스트 생성
                     const partsMap = new Map();
                     safeArray(currentData?.equipment?.item_equipment).forEach(i => partsMap.set(i.item_equipment_part, i.item_equipment_part));
                     safeArray(currentData3?.equipment?.item_equipment).forEach(i => { if(!partsMap.has(i.item_equipment_part)) partsMap.set(i.item_equipment_part, i.item_equipment_part); });
                     const allParts = Array.from(partsMap.values());
                     
                     if (allParts.length === 0) return <div className="col-span-full"><NoDataAlert message="장착 아이템 데이터 없음" /></div>;

                     return allParts.map((partName, idx) => {
                        const item4 = currentData?.equipment?.item_equipment?.find(i => i.item_equipment_part === partName);
                        const item3 = isCompareMode ? currentData3?.equipment?.item_equipment?.find(i => i.item_equipment_part === partName) : null;
                        
                        return (
                          <div key={idx} className={`bg-[#1e2028] rounded-2xl border flex flex-col shadow-lg overflow-hidden transition-all ${isCompareMode && item3 && item4 && item3?.item_name !== item4?.item_name ? 'border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-slate-800'}`}>
                             <div className="bg-[#111318] px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{partName}</span>
                                {isCompareMode && item3 && item4 && item4?.item_name !== item3?.item_name && <span className="text-[9px] font-bold text-orange-400 bg-orange-950/30 px-2 rounded-full border border-orange-500/20">장비 교체됨</span>}
                             </div>
                             {isCompareMode ? (
                               <div className="flex divide-x divide-slate-800 h-full">
                                 <div className="flex-1 p-4 bg-slate-900/20 opacity-80 flex flex-col">
                                   <div className="text-[10px] font-bold text-blue-400 mb-2 pb-1 border-b border-blue-900/30">{LBL_PAST}</div>
                                   {renderItemCard(item3, false)}
                                 </div>
                                 <div className="flex-1 p-4 bg-slate-900/40 flex flex-col">
                                   <div className="text-[10px] font-bold text-orange-400 mb-2 pb-1 border-b border-orange-900/30">{LBL_NOW}</div>
                                   {renderItemCard(item4, true)}
                                 </div>
                               </div>
                             ) : (
                               <div className="flex-1 p-4 flex flex-col">{renderItemCard(item4, true)}</div>
                             )}
                          </div>
                        );
                     });
                  })()}
                </div>
              )}
              {equipSubTab === 'cash' && ( <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{safeArray(activeData?.cashEquipment?.cash_item_equipment_preset_1).map((item, idx) => (<div key={idx} className="bg-[#1e2028] p-3 rounded-xl border border-slate-700/50 flex flex-col items-center text-center"><div className="w-12 h-12 mb-2 flex items-center justify-center"><img src={item.cash_item_icon} alt="icon" className="max-w-full max-h-full object-contain" /></div><span className="text-[10px] text-slate-500">{item.cash_item_equipment_part}</span><span className="text-xs font-semibold text-slate-200 mt-1 line-clamp-2">{item.cash_item_name}</span></div>))}</div> )}
              {equipSubTab === 'pet' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg"><h3 className="text-sm font-semibold text-slate-300 mb-4">안드로이드</h3>{activeData?.android?.android_name ? (<div className="bg-[#181a20] p-4 rounded-xl border border-slate-700 flex items-center gap-4"><div className="w-16 h-16 bg-slate-900 rounded border flex items-center justify-center"><img src={activeData.android.android_icon} alt="android"/></div><div><div className="font-bold text-slate-200 mb-1">{activeData.android.android_name}</div><div className="text-xs text-slate-400">헤어: {activeData.android.android_hair?.hair_name}</div><div className="text-xs text-slate-400">성형: {activeData.android.android_face?.face_name}</div></div></div>) : <NoDataAlert message="안드로이드 데이터 없음" />}</div>
                  <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg"><h3 className="text-sm font-semibold text-slate-300 mb-4">펫</h3>{activeData?.pet ? (<div className="space-y-3">{[1, 2, 3].map(num => { const petName = activeData.pet[`pet_${num}_name`]; if (!petName) return null; return (<div key={num} className="bg-[#181a20] p-3 rounded-xl border border-slate-700 flex items-center gap-4"><img src={activeData.pet[`pet_${num}_icon`]} alt="pet" className="w-10 h-10 object-contain" /><div className="text-sm font-medium text-slate-200">{petName}</div></div>); })}</div>) : <NoDataAlert message="펫 데이터 없음" />}</div>
                </div>
              )}
              {equipSubTab === 'symbol' && ( <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{safeArray(activeData?.symbols?.symbol).map((sym, idx) => (<div key={idx} className="bg-[#181a20] p-4 rounded-xl flex items-center justify-between border border-slate-700/50"><div className="flex items-center gap-4"><img src={sym.symbol_icon} alt="symbol" className="w-12 h-12 object-contain" /><div><div className="text-sm font-semibold text-slate-200">{sym.symbol_name}</div><div className="text-xs text-slate-400 mt-0.5">성장: {sym.symbol_growth_count}/{sym.symbol_require_growth_count}</div></div></div><div className="text-right"><div className="text-sm font-bold text-orange-400">Lv. {sym.symbol_level}</div><div className="text-xs text-blue-300 mt-0.5">포스 +{sym.symbol_force}</div></div></div>))}</div></div> )}
              {equipSubTab === 'set' && ( <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg grid grid-cols-1 lg:grid-cols-2 gap-6">{safeArray(activeData?.setEffect?.set_effect).map((setInfo, idx) => (<div key={idx} className="bg-[#181a20] rounded-xl border border-slate-700/50 p-5"><div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2"><h4 className="font-bold text-slate-200 text-sm">{setInfo.set_name}</h4><span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded-lg border border-orange-500/30">{setInfo.total_set_count}세트 적용</span></div><div className="space-y-1 text-xs text-slate-400">{safeArray(setInfo.set_effect_info).map((eff, i) => (<div key={i} className={`p-2 rounded ${eff.set_count <= setInfo.total_set_count ? 'bg-green-900/10 text-green-300' : 'opacity-50'}`}><span className="font-semibold block mb-0.5">{eff.set_count}세트 효과</span><span className="whitespace-pre-wrap">{eff.set_option}</span></div>))}</div></div>))}</div> )}
            </div>
          )}

          {/* ======================= SKILLS TAB ======================= */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex space-x-2 border-b border-slate-800 pb-2">
                {[{ id: 'hexa', label: '6차 (HEXA)' }, { id: 'vmatrix', label: '5차 (V 매트릭스)' }, { id: 'basic', label: '1~4차/하이퍼' }, { id: 'link', label: '링크 스킬' }].map(st => (
                  <button key={st.id} onClick={() => setSkillSubTab(st.id)} className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${skillSubTab === st.id ? 'bg-orange-600 text-white' : 'bg-[#181a20] text-slate-400 hover:bg-slate-700'}`}>{st.label}</button>
                ))}
              </div>
              {skillSubTab === 'hexa' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeArray(activeData?.hexa?.character_hexa_core_equipment).length > 0 ? (
                    safeArray(activeData.hexa.character_hexa_core_equipment).map((core, idx) => (
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
                  {safeArray(activeData?.vmatrix?.character_v_core_equipment).length > 0 ? (
                    safeArray(activeData.vmatrix.character_v_core_equipment).map((core, idx) => (
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
                  {activeData?.skills ? (
                    <div className="space-y-8">
                      {["hyper", "6", "5", "4", "3", "2", "1", "0"].map(grade => {
                        const sData = activeData.skills[`grade_${grade}`];
                        if (!sData?.character_skill?.length) return null;
                        return (
                          <div key={grade}>
                            <h4 className="text-sm font-bold text-orange-400 mb-3 border-b border-slate-700 pb-2">{grade === 'hyper' ? '하이퍼 스킬' : `${grade}차 스킬`}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {safeArray(sData.character_skill).map((sk, idx) => (
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
                  {safeArray(activeData?.linkSkill?.character_link_skill_equipment).length > 0 ? (
                    safeArray(activeData.linkSkill.character_link_skill_equipment).map((link, idx) => (
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

          {/* ======================= UNION / LOGS TAB ======================= */}
          {activeTab === 'union' && (
            <div className="space-y-6">
              <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
                {[ { id: 'compare_rng', label: '⚔️ 시즌 운 대결' }, { id: 'summary_starforce', label: '★ 강화 통계' }, { id: 'summary_cube', label: '🎲 큐브/잠재 통계' }, { id: 'exp', label: '경험치 이력' }, { id: 'logs', label: '전체 로그' }, { id: 'rank', label: '랭킹 및 무릉' } ].map(st => {
                  if(st.id === 'compare_rng' && !isCompareMode) return null;
                  return (
                    <button key={st.id} onClick={() => setLogSubTab(st.id)} className={`px-4 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${logSubTab === st.id ? 'bg-orange-600 text-white' : 'bg-[#181a20] text-slate-400 hover:bg-slate-700'}`}>{st.label}</button>
                  )
                })}
              </div>

              {/* 운/억까 통계 대결 화면 */}
              {logSubTab === 'compare_rng' && isCompareMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-xl text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-bl-full blur-xl pointer-events-none"></div>
                    <h3 className="text-lg font-black text-red-400 mb-2 flex items-center justify-center"><Flame className="w-5 h-5 mr-2" /> 펑펑 우는 장비 파괴 횟수</h3>
                    <p className="text-xs text-slate-400 mb-6">두 시즌 동안 스타포스 강화 중 아이템이 파괴된 횟수입니다.</p>
                    <div className="flex justify-around items-center">
                      <div className={`p-4 rounded-xl border w-28 ${s3Stats.totalDestroys < s4Stats.totalDestroys ? 'bg-green-900/20 border-green-500/50' : 'bg-[#181a20] border-slate-700'}`}>
                        <div className="text-xs font-bold text-blue-400 mb-1">{LBL_PAST}</div>
                        <div className="text-3xl font-black text-white">{s3Stats.totalDestroys}<span className="text-xs font-normal text-slate-500 ml-1">번</span></div>
                      </div>
                      <div className="text-2xl font-black text-slate-600 italic">VS</div>
                      <div className={`p-4 rounded-xl border w-28 ${s4Stats.totalDestroys <= s3Stats.totalDestroys ? 'bg-green-900/20 border-green-500/50' : 'bg-[#181a20] border-slate-700'}`}>
                        <div className="text-xs font-bold text-orange-400 mb-1">{LBL_NOW}</div>
                        <div className="text-3xl font-black text-white">{s4Stats.totalDestroys}<span className="text-xs font-normal text-slate-500 ml-1">번</span></div>
                      </div>
                    </div>
                    <div className="mt-6 text-sm text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-700">
                      결과: <strong className="text-white">{s4Stats.totalDestroys <= s3Stats.totalDestroys ? `🎉 ${LBL_NOW}은 운이 좋았습니다!` : `😭 ${LBL_NOW}은 억까를 당하셨군요...`}</strong>
                    </div>
                  </div>

                  <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-xl text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full blur-xl pointer-events-none"></div>
                    <h3 className="text-lg font-black text-purple-400 mb-2 flex items-center justify-center"><Sparkles className="w-5 h-5 mr-2" /> 잠재/큐브 재설정 횟수</h3>
                    <p className="text-xs text-slate-400 mb-6">옵션을 띄우기 위해 큐브와 잠재능력을 재설정한 총 횟수입니다.</p>
                    <div className="flex justify-around items-center">
                      <div className="p-4 rounded-xl bg-[#181a20] border border-slate-700 w-28">
                        <div className="text-xs font-bold text-blue-400 mb-1">{LBL_PAST}</div>
                        <div className="text-3xl font-black text-white">{s3Stats.totalCubes.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-1">번</span></div>
                      </div>
                      <div className="text-2xl font-black text-slate-600 italic">VS</div>
                      <div className="p-4 rounded-xl bg-[#181a20] border border-slate-700 w-28">
                        <div className="text-xs font-bold text-orange-400 mb-1">{LBL_NOW}</div>
                        <div className="text-3xl font-black text-white">{s4Stats.totalCubes.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-1">번</span></div>
                      </div>
                    </div>
                    <div className="mt-6 text-sm text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-700 flex items-center justify-center">
                      {LBL_PAST} 대비 <strong className="text-white mx-1">{Math.abs(s4Stats.totalCubes - s3Stats.totalCubes).toLocaleString()}번</strong> 
                      {s4Stats.totalCubes > s3Stats.totalCubes ? <span className="text-red-400 flex items-center"><ArrowUpRight className="w-4 h-4 ml-1"/> 더 돌렸습니다!</span> : <span className="text-green-400 flex items-center"><ArrowDownRight className="w-4 h-4 ml-1"/> 덜 돌렸습니다!</span>}
                    </div>
                  </div>
                </div>
              )}

              {logSubTab === 'summary_starforce' && (
                <div className="space-y-4">
                  <div className="bg-[#181a20] p-3 rounded text-xs text-slate-400 border border-slate-800">* API 특성상 메소 소모량은 제공되지 않아 <strong className="text-slate-200">횟수</strong> 기반으로 누적 계산하여 보여줍니다.</div>
                  {s4Stats.sfSummaryArray.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {s4Stats.sfSummaryArray.map((sf, idx) => {
                        const targetStar = sf.maxTargetStar; const targetStats = sf.targetStarStats[targetStar] || { success: 0, fail: 0, destroy: 0 };
                        return (
                          <div key={idx} className="bg-[#1e2028] rounded-xl border border-slate-700/50 p-5 flex flex-col text-center shadow-lg relative overflow-hidden">
                            <div className="text-sm font-semibold text-slate-200 mb-3 truncate">{sf.name}</div>
                            <div className="flex items-center justify-center space-x-2 text-lg font-black text-orange-400 mb-3"><span>★{sf.startStar}</span><ChevronRight className="w-5 h-5 text-slate-500" /><span>★{sf.endStar}</span></div>
                            <div className="text-xs text-slate-400 mb-2">강화/파괴 <span className="text-slate-200">{sf.totalTries}번</span> / <span className="text-red-400">{sf.destroys}번</span></div>
                            {targetStar > 0 && (
                              <div className="text-[10px] bg-[#181a20] rounded p-2 border border-slate-700/50 mt-auto mb-3">
                                <div className="font-bold text-yellow-400 mb-1">★{targetStar} 도전 기록</div>
                                <div className="flex justify-center space-x-2 text-slate-300"><span><span className="text-green-400">{targetStats.success}</span>성공</span><span><span className="text-slate-500">{targetStats.fail}</span>실패</span>{targetStats.destroy > 0 && <span><span className="text-red-400">{targetStats.destroy}</span>파괴</span>}</div>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-500 tracking-wider">{sf.startDate} ~ {sf.endDate}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <NoDataAlert message="스타포스 강화 기록이 없습니다." />}
                </div>
              )}

              {logSubTab === 'summary_cube' && (
                <div className="space-y-4">
                  <div className="bg-[#181a20] p-3 rounded text-xs text-slate-400 border border-slate-800">* 수집된 큐브 및 잠재능력 재설정 횟수를 취합한 결과입니다.</div>
                  {s4Stats.cubeSummaryArray.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {s4Stats.cubeSummaryArray.map((cube, idx) => {
                        const types = Object.entries(cube.types).sort((a,b) => b[1] - a[1]);
                        return (
                          <div key={idx} className="bg-[#1e2028] rounded-xl border border-slate-700/50 p-5 flex flex-col shadow-lg">
                            <div className="text-sm font-semibold text-slate-200 text-center mb-4 truncate border-b border-slate-700 pb-2">{cube.name}</div>
                            <div className="space-y-2 flex-1">
                              {types.map(([typeName, count], i) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-[#181a20] p-2 rounded">
                                  <span className="flex items-center text-slate-300">
                                    <div className={`w-2 h-2 rounded-full mr-2`} style={{ backgroundColor: getGradeColor(typeName) }} />
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
                  ) : <NoDataAlert message="잠재능력 재설정 기록이 없습니다." />}
                </div>
              )}

              {logSubTab === 'exp' && (
                <div className="bg-[#1c1d21] rounded-xl border border-slate-700 overflow-hidden shadow-inner">
                  {generatedExpHistory.length > 0 ? (
                    <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                      <table className="w-full text-left text-sm text-slate-300 border-collapse whitespace-nowrap">
                        <thead className="bg-[#26272b] text-slate-200 border-b border-slate-700 sticky top-0 z-10 shadow-sm">
                          <tr><th className="px-5 py-3.5 font-semibold tracking-wide text-xs">날짜</th><th className="px-5 py-3.5 font-semibold tracking-wide text-xs">요일</th><th className="px-5 py-3.5 font-semibold tracking-wide text-xs">레벨</th><th className="px-5 py-3.5 font-semibold tracking-wide text-xs">경험치</th><th className="px-5 py-3.5 font-semibold tracking-wide text-xs">경험치 %</th><th className="px-5 py-3.5 font-semibold tracking-wide text-xs">상승 경험치 %</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {generatedExpHistory.map((exp, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-3">{exp.date}</td><td className="px-5 py-3">{exp.dayOfWeek}</td><td className="px-5 py-3">{exp.level}</td><td className="px-5 py-3">{exp.exp.toLocaleString()}</td><td className="px-5 py-3">{exp.expRate.toFixed(3)}%</td>
                              <td className="px-5 py-3 font-medium">
                                {exp.isFirst ? <span className="text-slate-500">-</span> : (
                                  <div className="flex items-center"><span className={exp.gainedRate > 0 ? "text-slate-100" : "text-slate-400"}>{exp.gainedRate > 0 ? '+' : ''}{Number(exp.gainedRate.toFixed(3))}%</span>{exp.isLevelUp && <span className="ml-2 text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-400 px-1.5 py-0.5 rounded">LEVEL UP</span>}</div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <NoDataAlert message="경험치 변동 내역이 없습니다." />}
                </div>
              )}

              {logSubTab === 'logs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-[#1e2028] p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">큐브 최근 사용 (100건)</h3>
                    {activeData?.historyCube?.cube_history?.length > 0 ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {safeArray(activeData.historyCube.cube_history).slice(0, 100).map((log, idx) => {
                          const beforeOpts = log?.before_potential_option?.length ? log.before_potential_option : log?.before_additional_potential_option;
                          const afterOpts = log?.after_potential_option?.length ? log.after_potential_option : log?.after_additional_potential_option;
                          return (
                            <div key={idx} className="bg-[#181a20] p-2 rounded border border-slate-700/50 text-[10px]">
                              <div className="flex justify-between text-slate-500 mb-1"><span>{log?.date_create?.replace('T', ' ')?.substring(0, 16)}</span><span className="text-orange-400">{log?.cube_type}</span></div>
                              <div className="font-semibold text-slate-300 mb-1">{log?.target_item || '알 수 없는 장비'}</div>
                              <div className="flex gap-2"><div className="flex-1 bg-slate-900/50 p-1 rounded"><span className="text-slate-500 block">전</span>{safeArray(beforeOpts).map(o => o?.value).join(', ') || '-'}</div><div className="flex-1 bg-slate-900/50 p-1 rounded"><span className="text-cyan-500 block">후</span>{safeArray(afterOpts).map(o => o?.value).join(', ') || '-'}</div></div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <NoDataAlert message="최근 큐브 내역 없음" />}
                  </div>

                  <div className="bg-[#1e2028] p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">스타포스 최근 강화 (100건)</h3>
                    {activeData?.historyStarforce?.starforce_history?.length > 0 ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {safeArray(activeData.historyStarforce.starforce_history).slice(0, 100).map((log, idx) => {
                          const isSucc = log?.item_upgrade_result === '성공'; const isDest = log?.item_upgrade_result === '파괴';
                          return (
                            <div key={idx} className={`bg-[#181a20] p-2 rounded border text-[10px] ${isSucc ? 'border-green-500/30' : isDest ? 'border-red-500/50' : 'border-slate-700/50'}`}>
                              <div className="flex justify-between text-slate-500 mb-1"><span>{log?.date_create?.replace('T', ' ')?.substring(0, 16)}</span><span className={isSucc ? 'text-green-400' : isDest ? 'text-red-500' : 'text-slate-400'}>{log?.item_upgrade_result}</span></div>
                              <div className="font-semibold text-slate-300 mb-1 truncate">{log?.target_item || '장비명 없음'}</div>
                              <div className="flex justify-center bg-slate-900/50 py-1 rounded text-slate-300">★{log?.before_starforce_count} <ChevronRight className="w-3 h-3 mx-1" /> <span className={isSucc?'text-green-400':''}>★{log?.after_starforce_count}</span></div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <NoDataAlert message="최근 스타포스 내역 없음" />}
                  </div>

                  <div className="bg-[#1e2028] p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">메소 잠재 재설정 (100건)</h3>
                    {activeData?.historyPotential?.potential_history?.length > 0 ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {safeArray(activeData.historyPotential.potential_history).slice(0, 100).map((log, idx) => {
                          const beforeOpts = log?.before_potential_option?.length ? log.before_potential_option : log?.before_additional_potential_option;
                          const afterOpts = log?.after_potential_option?.length ? log.after_potential_option : log?.after_additional_potential_option;
                          return (
                            <div key={idx} className="bg-[#181a20] p-2 rounded border border-slate-700/50 text-[10px]">
                              <div className="flex justify-between text-slate-500 mb-1"><span>{log?.date_create?.replace('T', ' ')?.substring(0, 16)}</span><span className="text-purple-400">{log?.potential_type}</span></div>
                              <div className="font-semibold text-slate-300 mb-1">{log?.target_item || '장비명 없음'}</div>
                              <div className="flex gap-2"><div className="flex-1 bg-slate-900/50 p-1 rounded"><span className="text-slate-500 block">전</span>{safeArray(beforeOpts).map(o => o?.value).join(', ') || '-'}</div><div className="flex-1 bg-slate-900/50 p-1 rounded"><span className="text-cyan-500 block">후</span>{safeArray(afterOpts).map(o => o?.value).join(', ') || '-'}</div></div>
                            </div>
                          );
                        })}
                      </div>
                    ) : <NoDataAlert message="최근 메소 재설정 내역 없음" />}
                  </div>
                </div>
              )}

              {logSubTab === 'rank' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg text-center">
                    <h3 className="text-xs font-semibold text-slate-500 mb-2">무릉도장 최고 기록</h3>
                    <div className="text-3xl font-black text-white">{activeData?.dojang?.dojang_best_floor ? `${activeData.dojang.dojang_best_floor}층` : '-'}</div>
                    <div className="text-xs text-slate-500 mt-2">시간: {activeData?.dojang?.dojang_best_time ? `${activeData.dojang.dojang_best_time}초` : '-'}</div>
                  </div>
                  <div className="md:col-span-2 bg-[#1e2028] p-6 rounded-2xl border border-slate-800 shadow-lg">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">각종 랭킹 순위</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: '종합 랭킹', data: activeData?.rankingOverall?.[0] },
                        { name: '유니온 랭킹', data: activeData?.rankingUnion?.[0] },
                        { name: '무릉도장 랭킹', data: activeData?.rankingDojang?.[0] },
                        { name: '업적 랭킹', data: activeData?.rankingAchievement?.[0] }
                      ].map((rk, idx) => (
                        <div key={idx} className="bg-[#181a20] p-4 rounded-xl border border-slate-700/50">
                          <span className="text-[10px] text-slate-500 block mb-1">{rk.name}</span>
                          {rk.data ? <div className="font-bold text-lg text-slate-200">{rk.data.ranking?.toLocaleString()}위</div> : <span className="text-xs text-slate-600">기록 없음</span>}
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
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        input[type=range] { -webkit-appearance: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #f97316; cursor: pointer; box-shadow: 0 0 10px rgba(249, 115, 22, 0.5); }
      `}} />
    </div>
  );
}