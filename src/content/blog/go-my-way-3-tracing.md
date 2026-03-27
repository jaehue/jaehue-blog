---
date: "2017-10-30T00:00:00+08:00"
draft: false
title: "Go My Way #3 - 트레이싱"
categories:
  - IT
tags:
  - golang
---
**Go My Way**는 Go 언어로 웹 어플리케이션을 작성할 때 선호하는 나만의 방식을 3편에 걸쳐서 소개하는 글이다.
이전 글은 읽지 않았다면 아래 링크를 참조하기 바란다.


- [Go My Way #1 - 웹 프레임워크](/post/go-my-way-1-webframework/)
- [Go My Way #2 - 데이터베이스, 로깅](/post/go-my-way-2-database-and-logging/)
- Go My Way #3 - 트레이싱
- 번외 - gomobile

이번 글에서는 `트레이싱`에 대해 소개하겠다.

이 글을 작성하는 지금 현재 우리 회사는 클라우드 상에 50여 개의 마이크로 서비스가 서로 얽혀서 동작하고 있다.
사용자의 한 번의 클릭이 실제로는 여러 마이크로 서비스들을 거치고 거쳐서 최종 결과를 고객에게 보여준다.
처리 과정 중에 비즈니스적으로 주요 행위가 일어나면 이벤트가 발생하고, consumer service가 그 이벤트를 받아서 여러 액션을 처리한다.

![microservice](/images/tracing/microservice.png)

> <small>EventBroker: 이벤트를 publish하고 subscription 하는 일련의 과정을 처리해주는 서비스. 내부적으로는 kafka를 사용해서 이벤트를 전달한다.  기본적인 이벤트 전달 기능 외에 consume service간 balance 조정, 로깅, offset 관리 등의 일을 처리한다.</small>

마이크로 서비스 환경으로 1년 정도 운영을 해보니 기존의 모노리틱(monolitic) 방식과는 또 다른 어려움이 있었다.

## 무엇이 문제인가?

### 오류를 추적하기가 어렵다

이제 더이상 nginx의 access log와 개발자가 개별적으로 남기는 로그만으로는 문제를 추적하기가 너무 어려워졌다.

- 위와 같이 복잡한 처리 흐름이 이어지는 경우, A 서비스에서는 아무 문제가 없이 처리 되었는데 C 서비스는 아예 동작조차 하지 않았다.
프로그램상의 오류일까? 아니면 네트워크 장애인가? 어디에선가 타임아웃이 발생한 것은 아닐까?
- 이벤트를 받아 처리해야 하는 D 서비스가 동작하지 않았다면, 도대체 어디에서 문제가 발생한 것일까? 내 서비스는 문제 없는데(_당연하지! 내가 짰으니!!_) Event Broker가 이벤트를 먹어버린 걸까?

다른 팀을 의심하기도 하고, 그냥 문제 해결을 포기하고 만다.
사용자는 불편을 겪고 있는데, 문제가 무엇인지 정의할 수도 없다.

### 비즈니스 흐름을 파악하기 어렵다

하나의 마이크로 서비스가 만들어지면, 어느 팀이든지 그 서비스를 사용할 수 있다.
중요한 행위에 대해 이벤트를 정의하고 그 이벤트를 발생시키면, 필요한 누군가가 그 이벤트를 _subscribe_ 해서 또 다른 로직을 이어간다.
이렇게 여러 팀이 개발한 서비스들이 서로 얽히고 얽혀서 하나의 요청이 처리된다.
이렇게 되다 보니 사용자가 버튼 하나를 클릭했을 때 어떤 일이 일어나는지 파악하는 것은 거의 불가능해졌다.
한 서비스의 작은 변경사항이 전혀 예상하지 못했던 곳에서 문제를 일으키기도 한다.

예전에는 비즈니스 로직을 파악하려면 소스코드를 한 줄 한 줄 읽어내려가면 되었지만,
지금과 같이 여러 서비스들 간의 상호작용으로 하나의 기능이 완성되는 마이크로 서비스 환경에서는
서비스들의 연관 관계가 명확하지 않으면 비즈니스 로직도 명확해질 수 없다.

음.. 우리가 고객에게 제공하는 기능이 정확히 어떻게 동작하는지도 모르는 상황이 되어 버렸다.

### 병목 지점을 찾을 수 없다

사용자 수가 갑자기 늘어난 것도 아니고 서버의 자원이 고갈된 것도 아닌데, 응답시간이 유난히 늦어질 때가 있다.
도대체 어디가 병목인 걸까?

## 트레이스 시스템의 필요

이제 서비스의 모든 행위에 대한 기록을 남기고 이것을 투명하게 드러내야 할 필요성이 생겼다.

대표적인 트레이스 솔루션으로는 [zipkin](http://zipkin.io/), [lightstep](http://lightstep.com/), [appdash](https://github.com/sourcegraph/appdash) 등이 있고, [opentracing](http://opentracing.io/)를 사용하면 트레이스 서버로 모든 행위에 대한 정보를 쉽게 전달할 수 있다.
이런 잘 갖춰진(?) 솔루션들은 지금 당장 설치해서 사용하기는 쉽지만, 실제 운영을 해보면 여러 어려움에 부딪힌다.
그 어려움은 대부분 이 두 가지 패턴으로 좁혀지는데,

- 기능이 너무 많다.  
  그래서 학습해야 할 것도 많다.
  사실 우리가 필요한 기능은 그 솔루션에서 제공하는 기능의 일부분일 뿐이다.
  화려한 UI와 깔끔한 Getting Started 문서에 혹해서 시작은 했지만, 정작 내가 원하는 모습에 도달하기까지 학습해야 할 것이 한둘이 아니다.
  특정 솔루션의 사용법을 학습하고 있자니, 주객이 전도되는 느낌을 받을 때가 있다.
- 정작 필요한 기능은 없다.  
  여러 기능을 제공하고 있지만, 그 기능은 우리에게 딱 맞는 기능이 아니다.
  결국, 우리 입맛에 맞게 customizing해서 사용해야 하는데, 그 과정에도 상당한 시간과 노력이 들어간다.


어떤 솔루션을 처음 도입할 때는 그 솔루션의 문제 해결 방식과 사상을 잘 모르고 접근하는 경우가 많다.
어떤 솔루션이든 어떤 문제를 효율적으로 해결하기 위해 많은 시도를 하다가 최종적으로 최적화된 무언가가 만들어진 것일 텐데,
과정은 모른 채 최종 모습만 보고 따라 한다면 그것이 제시하는 최적의 방법으로 문제 해결을 못 하는 경우가 많다.
즉 처음에는, 내 손으로 한 땀 한 땀 구성해보고, 솔루션이 문제를 해결하는 방식에 충분한 공감이 되었을 때 그것을 사용해야 잘 활용할 수 있다.

이런 이유로 트레이스 환경도 직접 구성하기로 했다.

## Behavior log 남기기

nginx에서 남기는 access log와 구분하기 위해 각 마이크로 서비스에서 남기는 트레이스 정보를 behavior log라고 부르기로 했다.
nginx에서 남기는 access log는 단순히 사용자의 접속 정보를 보여주는 것이라면, behavior log는 클라우드 내부의 마이크로 서비스들의 행위를 보여주는 로그인 것이다.

behavior log를 남기는 규칙과 방식은 다음과 같다.

### behavior log 식별하기

- `RequestID`
- `ActionID`
- `ParentActionID`

사용자의 하나의 요청으로 이루어지는 모든 행위는 모두 같은 `RequestID`를 가진다.
그리고 각각의 마이크로 서비스에서 처리하는 행위는 고유의 `ActionID`를 가진다.
즉 마이크로 서비스에서 처리하는 모든 액션에는 `RequestID`와 `ActionID`가 부여된다.
이때 나를 호출한 caller 서비스의 `ActionID`는 `ParentActionID`가 된다.
`RequestID`, `ActionID`, `ParentActionID` 이 세 가지로 실제 요청이 처리되는 흐름을 정확하게 표현할 수 있다.

위 그림에서 표현한 Request 처리 흐름을 `RequestID`, `ActionID`, `ParentActionID` 세 가지로 다시 표현해 보았다.

![tracing](/images/tracing/tracing.png)

아래는 모든 마이크로 서비스가 지켜야 할 규칙이다.

1. nginx에서 모든 요청에 대해 `RequestID`를 생성하고 헤더 `X-Request-ID`에 전달.   
  (참고: [ngx_http_core_module.html#var_request_id](http://nginx.org/en/docs/http/ngx_http_core_module.html#var_request_id))
2. 각 마이크로 서비스에서는 모든 요청 처리에 대해 `ActionID` 생성.
3. 다른 마이크로 서비스를 호출할 때는 `RequestID`와 자신의 `ActionID`를 헤더 `X-Request-ID`, `X-Action-ID`에 전달.
4. 각 마이크로 서비스에서 요청 처리가 끝나면 헤더를 통해 전달받은 `RequestID`와 자신이 직접 생성한 `ActionID`를 로그로 남김.
  이때 Header에 `X-Action-ID`가 존재하면 그것을 `ParentActionID` 값으로 남긴다.

위 기능을 처리하는 코드는 다음과 같다.
코드는 [[#1 - 웹 프레임워크]](/post/go-my-way-1-webframework/)에서 설명한 echo 프레임워크를 기준으로 작성했다.

{{< highlight go >}}
func main() {
	e := echo.New()
	/* ... */
	e.Use(BehaviorMiddleware)

	if err := e.Start(":8080"); err != nil {
		log.Println(err)
	}

}

func BehaviorMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) (err error) {
		req := c.Request()

		requestId := req.Header.Get("X-Request-ID")
		actionId := random.String(32)
		parentActionId := req.Header.Get("X-Action-ID")

		defer func(begin time.Time) {
			logrus.WithFields(logrus.Fields{
				"request_id":       requestId,
				"action_id":        actionId,
				"parent_action_id": parentActionId,
				"timestamp":        begin.UnixNano(),
				"latency":          time.Since(begin).Nanoseconds(),
				"error":            err,
				/* ... */
			}).Info()
		}(time.Now())

		/* ... */

		err = next(c)

		/* ... */
		return
	}
}
{{< /highlight >}}

하지만 우리가 풀어야 할 과제는 이것뿐만이 아니다.
Request의 처리 완료 상황뿐만 아니라, 처리 과정 중에도 로그를 남겨야 하는 경우가 있다.
이 로그에도 `RequestID`, `ActionID`, `ParentActionID`가 있어야 전후의 맥락을 파악할 수 있다.
(*모든 로그는 전후의 상황을 함께 봐야 의미를 알 수 있다.*)
그리고 기본적인 Web Request 정보 외에도 로직 상의 중요한 값들은 함께 남겨 주어야 한다.(예: 현재 세션의 사용자 ID, 주요 파라미터, 처리 결과 요약 정보, 등)
즉, 단순히 미들웨어 기능만으로는 부족하다.

### `LogContext`

Request가 처리되는 동안 `context.Context`에는 로그 내용을 담고 있는 `LogContext`가 보관되어 있다.
추가로 로그를 남기고 싶을 때 `context.Context`에 있는 `LogContext`를 사용해서 로그를 남긴다.
{{< highlight go >}}
type LogContext struct {
	ParentActionID string    `json:"parent_action_id"`
	ActionID       string    `json:"action_id"`
	RequestID      string    `json:"request_id"`
	Timestamp      time.Time `json:"timestamp"`
	Service        string    `json:"service"`

	Params     interface{}            `json:"params,omitempty"`
	Controller string                 `json:"controller,omitempty"`
	Action     string                 `json:"action,omitempty"`
	BizAttr    map[string]interface{} `json:"bizAttr,omitempty"`
	Err        error                  `json:"error,omitempty"`

	/* ... */
}
{{< /highlight >}}

> <small>`LogContext`의 전체 소스코드는 [behaviorlog.go](https://github.com/pangpanglabs/goutils/blob/master/behaviorlog/behaviorlog.go)를 참고해주세요</small>

`context.Context`는 하나의 Request 처리가 완료될 때 까지 스콥(scope)이 유지되므로, 같은 요청을 처리하는 동안 `LogContext`를 통해 남기는 로그는 같은 `RequestID`, `ActionID`를 가진다.
즉, 모든 로그는 `RequestID`, `ActionID`를 가지게 되고, 모든 로그는 어떤 맥락에서 처리가 되었는지 확인이 가능하다.

로그를 남기는 코드는 아래와 같다.


{{< highlight go >}}
BehaviorLogger(ctx).
	WithBizAttr("userID", currentUser.ID).
	Log("SearchDiscount")
{{< /highlight >}}

{{< highlight go >}}
func BehaviorLogger(ctx context.Context) *behaviorlog.LogContext {
	v := ctx.Value(behaviorlog.LogContextName)
	if logger, ok := v.(*behaviorlog.LogContext); ok {
		return logger.Clone()
	}
	return behaviorlog.NewNopContext()
}
{{< /highlight >}}

미들웨어에서는 `LogContext`를 사용하여 로그를 남기도록 아래와 같이 수정하였다.

{{< highlight go >}}
func BehaviorMiddleware(serviceName string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) (err error) {
			req := c.Request()
			behaviorLogger := behaviorlog.New(serviceName, req)

			// behaviorLogger를 context.Context에 담음
			c.SetRequest(req.WithContext(
				context.WithValue(req.Context(),
					behaviorlog.LogContextName, behaviorLogger,
				)))

			if err = next(c); err != nil {
				c.Error(err)
				behaviorLogger.Err = err
			}

			/***
			 처리 결과를 LogContext에 담는 로직
			**/

			behaviorLogger.Write()
			return
		}
	}
}
{{< /highlight >}}

Behavior log와 관련된 전체 소스코드는 아래 링크에서 확인할 수 있다.

- [github.com/pangpanglabs/echomiddleware](https://github.com/pangpanglabs/goutils/blob/master/echomiddleware/behavior_logger.go)
- [github.com/pangpanglabs/behaviorlog](https://github.com/pangpanglabs/goutils/blob/master/behaviorlog/behaviorlog.go)

### 다른 서비스 호출하기

앞서 다른 마이크로 서비스를 호출할때는 `RequestID`와 자신의 `ActionID`를 헤더에 담아서 전달한다고 설명했다.
어렵진 않지만 이것 또한 꽤나 번거로운 작업이다.
편의를 위해 [github.com/pangpanglabs/goutils/httpreq](https://github.com/pangpanglabs/goutils/tree/master/httpreq) 패키지를 만들었다.
다른 마이크로 서비스를 호출할때는 [httpreq](https://github.com/pangpanglabs/goutils/tree/master/httpreq) 패키지를 사용하면 편리하다.

{{< highlight go >}}
var v ApiResult
statusCode, err := httpreq.New(http.MethodPost, "TARGET_URL", param).
	WithRequestID("requestID-1").
	WithActionID("actionID-1").
	Call(&v)
{{< /highlight >}}
또는
{{< highlight go >}}
var v ApiResult
statusCode, err := httpreq.New(http.MethodPost, "TARGET_URL", param).
	WithBehaviorLogContext(behaviorlog.FromCtx(ctx)).
	Call(&v)
{{< /highlight >}}

### 외부 API 호출하기

호출하는 대상 서비스도 같은 방식으로 Behavior log를 남기도록 구성되어 있다면 트레이스 정보가 끊어지지 않고 하나의 흐름으로 이어질 것이다.
하지만 대상 서비스에서 Behavior log를 남기기 어려운 경우도 있다.
택배사 API를 사용한다던가 레거시 시스템과 인터페이스 하는 경우가 대표적인 예다.
이런 경우는 트레이스 로그의 흐름이 끊어지고 만다.

이렇게 우리의 관리 영역이 아닌 외부 API를 호출하는 경우는 외부 API의 처리 액션에 대한 Behavior log를 호출하는 쪽에서 남기기로 했다.

{{< highlight go >}}
BehaviorLogger(ctx).
	WithBizAttr("companyCode", "MY_COMPANY_CODE").
	WithCallURLInfo(http.MethodGet, "TARGET_URL", param, 200).
	Log("GetShippingStatus")
{{< /highlight >}}


## 안전한 로그 저장소

모든 트레이스 로그는 kafka를 거쳐 HDFS에 저장된다.
서로 다른 여러 데이터베이스에 쿼리를 실행할 수 있는 SQL Engine인 [Presto](https://prestodb.io/)를 통해 필요한 데이터를 추출한다.

![trace-hdfs](/images/tracing/trace_hdfs.png)

트레이스 로그를 활용하여 다영한 시각화 도구를 만들 수 있다.
아래는 시각화 도구의 예로, 사용자의 요청이 어떤 과정을 통해 처리되고 있는지를 실시간으로 보여주고 있다.

<div class="row post-image-bg">
    <video width="99%" height="540" autoplay loop muted>
        <source type="video/mp4" src="/images/tracing/eventflow.mp4"></source>
    </video>
</div>
