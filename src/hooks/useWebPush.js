import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase.js";
import { VAPID_PUBLIC_KEY, urlB64ToUint8Array } from "../utils/webPushConstants.js";
import { getKstIsoString } from "../utils/dateUtils.js";

const LOCAL_STORAGE_PUSH_KEY = "racebook_push_subscribed";

export function useWebPush(user) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(() => {
    if (typeof window === "undefined") return false;
    const perm = "Notification" in window ? Notification.permission : "default";
    if (perm === "denied") return false;
    return localStorage.getItem(LOCAL_STORAGE_PUSH_KEY) === "true";
  });
  const [loading, setLoading] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // iOS 환경 및 PWA 설치(standalone) 상태 감지
  const isIos = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone = typeof window !== "undefined" && (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
  const isInAppBrowser = typeof navigator !== "undefined" && (
    /KAKAOTALK|NAVER|Instagram|FB_IAB|FB4A|FBAN/i.test(navigator.userAgent)
  );
  const isIosNeedInstall = isIos && !isStandalone;

  // 1. 브라우저 지원 여부 및 현재 권한 확인
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  // 안전하게 활성화된 서비스 워커 등록 객체를 가져오는 헬퍼 (충분한 타임아웃 부여)
  const getSafeRegistration = async (timeoutMs = 8000) => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;

    // 1순위: navigator.serviceWorker.ready 대기 (active 상태 워커 보장)
    try {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const readyPromise = navigator.serviceWorker.ready;
      const readyReg = await Promise.race([readyPromise, timeoutPromise]);
      if (readyReg && readyReg.pushManager) return readyReg;
    } catch (e) {
      console.warn("SW ready wait error:", e);
    }

    // 2순위: 복수 등록 목록에서 active 워커 검색
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const activeReg = registrations.find((r) => r.active && r.pushManager) || registrations.find((r) => r.pushManager);
      if (activeReg) return activeReg;
    } catch {}

    // 3순위: 단일 getRegistration()
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.pushManager) return reg;
    } catch {}

    return null;
  };

  // 2. 현재 기기 푸시 구독 상태 확인 (새로고침/재방문 시 풀림 방지)
  const checkExistingSubscription = async (retryCount = 0) => {
    try {
      // 사용자가 브라우저 설정에서 명시적으로 차단한 경우
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setIsSubscribed(false);
        localStorage.removeItem(LOCAL_STORAGE_PUSH_KEY);
        return;
      }

      const reg = await getSafeRegistration(8000);
      if (!reg || !reg.pushManager) {
        // 서비스 워커 초기화가 지연되는 경우, 기존 켜짐 상태를 임의로 false로 덮어쓰지 않고 재시도
        if (retryCount < 2) {
          setTimeout(() => checkExistingSubscription(retryCount + 1), 2500);
        }
        return;
      }

      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
        localStorage.setItem(LOCAL_STORAGE_PUSH_KEY, "true");

        // 로그인된 유저인데 DB에 저장이 안 되어있을 수 있으므로 upsert 동기화
        if (user?.id && supabase) {
          const subJson = sub.toJSON();
          if (subJson.endpoint && subJson.keys) {
            await supabase.from("push_subscriptions").upsert(
              {
                user_id: user.id,
                endpoint: subJson.endpoint,
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth,
                user_agent: navigator.userAgent,
                updated_at: getKstIsoString()
              },
              { onConflict: "endpoint" }
            );
          }
        }
      } else {
        // sub가 없지만 권한이 이미 허용(granted)되어 있고 로컬에 켜짐 기록이 있는 경우 자동 복구
        const hasSavedFlag = localStorage.getItem(LOCAL_STORAGE_PUSH_KEY) === "true";
        if (hasSavedFlag && typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const newSub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            if (newSub) {
              setIsSubscribed(true);
              localStorage.setItem(LOCAL_STORAGE_PUSH_KEY, "true");
              if (user?.id && supabase) {
                const subJson = newSub.toJSON();
                if (subJson.endpoint && subJson.keys) {
                  await supabase.from("push_subscriptions").upsert(
                    {
                      user_id: user.id,
                      endpoint: subJson.endpoint,
                      p256dh: subJson.keys.p256dh,
                      auth: subJson.keys.auth,
                      user_agent: navigator.userAgent,
                      updated_at: getKstIsoString()
                    },
                    { onConflict: "endpoint" }
                  );
                }
              }
              return;
            }
          } catch (autoSubErr) {
            console.warn("구독 자동 복원 실패:", autoSubErr);
          }
        }

        // 실제로 구독하지 않은 경우
        setIsSubscribed(false);
        localStorage.removeItem(LOCAL_STORAGE_PUSH_KEY);
      }
    } catch (err) {
      console.warn("푸시 구독 상태 확인 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. 푸시 알림 켜기 (구독)
  const subscribe = useCallback(async () => {
    // iOS 사파리 브라우저 상태 (PWA 미설치)인 경우 홈 화면 추가 안내 모달 오픈
    if (isIosNeedInstall) {
      setShowIosGuide(true);
      return false;
    }

    if (!isSupported) {
      if (isIos) {
        alert("아이폰에서 웹푸시 알림을 이용하시려면 iOS 16.4 이상으로 업데이트가 필요합니다.");
      } else {
        alert("현재 브라우저는 웹푸시 알림을 지원하지 않습니다.");
      }
      return false;
    }

    try {
      setLoading(true);

      // 1. 브라우저 권한 요청
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        if (perm === "denied") {
          alert("알림 권한이 차단되어 있습니다. 브라우저 주소창 왼쪽의 자물쇠/설정 아이콘에서 알림을 허용해주세요.");
        }
        return false;
      }

      // 2. 서비스 워커 등록 확보
      let reg = await getSafeRegistration(8000);
      if (!reg || !reg.pushManager) {
        try {
          await navigator.serviceWorker.register("./sw.js");
          reg = await getSafeRegistration(8000);
        } catch (e) {
          console.warn("SW register fallback failed:", e);
        }
      }

      if (!reg || !reg.pushManager) {
        throw new Error("서비스 워커가 아직 활성화되지 않았습니다. 잠시 후 다시 시도해주세요.");
      }

      // 3. 푸시 매니저 구독 생성
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys) {
        throw new Error("푸시 구독 키 정보를 가져올 수 없습니다.");
      }

      // 4. 로컬 스토리지 및 UI 상태 즉시 영구 저장 (새로고침 시 풀림 방지)
      setIsSubscribed(true);
      localStorage.setItem(LOCAL_STORAGE_PUSH_KEY, "true");

      // 5. Supabase DB에 저장
      if (user?.id && supabase) {
        try {
          const { error } = await supabase.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              endpoint: subJson.endpoint,
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
              user_agent: navigator.userAgent,
              created_at: getKstIsoString(),
              updated_at: getKstIsoString()
            },
            { onConflict: "endpoint" }
          );

          if (error) {
            console.error("Supabase push_subscriptions 저장 실패:", error);
          }
        } catch (dbErr) {
          console.warn("Supabase push 저장 경고:", dbErr);
        }
      }

      // 6. 즉시 확인용 웰컴 알림 띄우기 (실패해도 구독 상태 유지)
      try {
        reg.showNotification("🔔 RACEBOOK 마라톤 스마트 알림 설정 완료", {
          body: "⭐ 찜한 대회의 접수 시작일과 🏃 출전 대회의 D-Day 일정을 오전 9시에 챙겨드립니다!",
          icon: "./icons/icon-192.png",
          badge: "./icons/icon-192.png"
        });
      } catch (notiErr) {
        console.warn("웰컴 알림 팝업 생략:", notiErr);
      }

      return true;
    } catch (err) {
      console.error("푸시 알림 구독 실패:", err);
      alert("푸시 알림 설정 중 오류가 발생했습니다: " + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, isIosNeedInstall, isIos, user?.id]);

  // 4. 푸시 알림 끄기 (구독 해제)
  const unsubscribe = useCallback(async () => {
    try {
      setLoading(true);

      // 1. 상태 및 로컬 스토리지 즉시 해제
      setIsSubscribed(false);
      localStorage.removeItem(LOCAL_STORAGE_PUSH_KEY);

      const reg = await getSafeRegistration(4000);
      const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null;

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        // Supabase DB에서도 제거
        if (supabase && endpoint) {
          try {
            await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
          } catch (delErr) {
            console.warn("Supabase push_subscriptions 삭제 오류:", delErr);
          }
        }
      }

      return true;
    } catch (err) {
      console.error("푸시 구독 해제 실패:", err);
      alert("푸시 해제 중 오류가 발생했습니다: " + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 5. 테스트 알림 전송 (로컬 서비스 워커로 즉시 테스트)
  const sendTestNotification = useCallback(async () => {
    if (!isSubscribed) {
      alert("먼저 푸시 알림을 켜주세요.");
      return;
    }
    const reg = await getSafeRegistration(4000);
    if (!reg) {
      alert("서비스 워커가 준비되지 않았습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    try {
      reg.showNotification("🏃 [테스트] 2027 전마협 새해 동계 마라톤 D-7", {
        body: "대회가 일주일 남았습니다! 마지막 주말 가벼운 조깅으로 컨디션을 조절하세요 🏃",
        icon: "./icons/icon-192.png",
        badge: "./icons/icon-192.png",
        vibrate: [200, 100, 200]
      });
    } catch (e) {
      alert("알림 띄우기 오류: " + e.message);
    }
  }, [isSubscribed]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isIos,
    isStandalone,
    isIosNeedInstall,
    isInAppBrowser,
    showIosGuide,
    setShowIosGuide
  };
}
