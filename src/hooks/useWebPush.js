import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { VAPID_PUBLIC_KEY, urlB64ToUint8Array } from "../utils/webPushConstants";

export function useWebPush(user) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
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

  // 안전하게 서비스 워커 등록 객체를 가져오는 헬퍼 (무한 대기 방지)
  const getSafeRegistration = async (timeoutMs = 1500) => {
    if (!("serviceWorker" in navigator)) return null;

    try {
      // 1순위: getRegistration()으로 이미 활성화된 SW 즉시 확인
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing) return existing;

      // 2순위: ready 대기 (timeoutMs 초과 시 포기)
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const readyPromise = navigator.serviceWorker.ready;
      return await Promise.race([readyPromise, timeoutPromise]);
    } catch {
      return null;
    }
  };

  // 2. 현재 기기 푸시 구독 상태 확인
  const checkExistingSubscription = async () => {
    try {
      const reg = await getSafeRegistration(1500);
      if (!reg || !reg.pushManager) {
        setIsSubscribed(false);
        return;
      }

      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
        // 만약 로그인된 유저인데 DB에 저장이 안 되어있을 수 있으므로 upsert 동기화
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
                updated_at: new Date().toISOString()
              },
              { onConflict: "endpoint" }
            );
          }
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.warn("푸시 구독 상태 확인 실패:", err);
      setIsSubscribed(false);
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

      // 브라우저 권한 요청
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        if (perm === "denied") {
          alert("알림 권한이 차단되어 있습니다. 브라우저 주소창 왼쪽의 자물쇠/설정 아이콘에서 알림을 허용해주세요.");
        }
        return false;
      }

      let reg = await getSafeRegistration(3000);
      if (!reg) {
        // 서비스 워커 명시적 등록 시도
        try {
          reg = await navigator.serviceWorker.register("./sw.js");
        } catch (e) {
          console.warn("SW register fallback failed:", e);
        }
      }

      if (!reg || !reg.pushManager) {
        throw new Error("서비스 워커가 아직 활성화되지 않았습니다. 페이지를 새로고침(F5) 후 다시 시도해주세요.");
      }

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

      // Supabase DB에 저장
      if (user?.id && supabase) {
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          },
          { onConflict: "endpoint" }
        );

        if (error) {
          console.error("Supabase push_subscriptions 저장 실패:", error);
          throw error;
        }
      }

      setIsSubscribed(true);

      // 즉시 확인용 웰컴 알림 띄우기
      reg.showNotification("🔔 RACEBOOK 마라톤 스마트 알림 설정 완료", {
        body: "⭐ 찜한 대회의 접수 시작일과 🏃 출전 대회의 D-Day 일정을 오전 9시에 챙겨드립니다!",
        icon: "./icons/icon-192.png",
        badge: "./icons/icon-192.png"
      });

      return true;
    } catch (err) {
      console.error("푸시 알림 구독 실패:", err);
      alert("푸시 알림 설정 중 오류가 발생했습니다: " + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, user?.id]);

  // 4. 푸시 알림 끄기 (구독 해제)
  const unsubscribe = useCallback(async () => {
    try {
      setLoading(true);
      const reg = await getSafeRegistration(2000);
      const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null;

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        // Supabase DB에서도 제거
        if (supabase && endpoint) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
        }
      }

      setIsSubscribed(false);
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
    const reg = await getSafeRegistration(2000);
    if (!reg) {
      alert("서비스 워커가 준비되지 않았습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    reg.showNotification("🏃 [테스트] 2027 전마협 새해 동계 마라톤 D-7", {
      body: "대회가 일주일 남았습니다! 마지막 주말 가벼운 조깅으로 컨디션을 조절하세요 🏃",
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      vibrate: [200, 100, 200]
    });
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
