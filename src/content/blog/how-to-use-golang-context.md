---
title: "Go언어에서 Context 사용하기"
description: "Go언어에서 Context 사용하기; golang"
date: "2018-06-19T00:00:00+09:00"
thumbnail: ""
draft: false
categories:
  - IT
tags:
  - "golang"
---

Go에는 다른 대중적인 언어와 다른 개념들이 좀 있다.

1. 클래스를 과감히 빼버렸고 <sub>(그래서 상속이 없다)</sub>
2. Exception이란 것도 없다 <sub>(예외 상황 자체를 허용하지 않겠다는 의지인가? 멋있어 보일진 몰라도 솔직히 불편하다. ㅠㅠ 궁시렁 궁시렁...)</sub>
3. 고루틴과 채널을 이용한 병행처리 모델도 친숙한 개념은 아니다

여기에 한 가지 더 보태자면, Context란 녀석이다.

처음 얘기한 세 가지는 Go 언어를 사용해서 뭔가를 만들려면 반드시 알아야 할 개념이기 때문에 Go 언어를 처음 접하는 대부분의 사람들은 시간을 할애해서 이 부분에 대해 공부를 한다.
하지만 컨텍스트는 사용하지 않아도 로직을 구현하는 데는 별문제가 없다는 생각에 개념을 충분히 익히지 않은 채 건너뛰는 경우도 있는 것 같다.

게다가 Go의 초기 버전에는 `context` 패키지가 없었다.
처음에는 외부 패키지(`golang.org/x/net/context`)로 존재하다가 Go 1.7 버전([2016년 8월에 릴리즈 됨](https://blog.golang.org/go1.7))부터 기본 라이브러리에 탑재되었다.
`golang.org/x/net/context` 패키지의 사용법은 이미 오래전부터 여러 컨퍼런스나 블로그에 소개는 되어 왔지만,
Go 1.7 이전 버전을 기준으로 작성된 책에서는 `context`의 사용법을 다루지 않는 경우가 많았다.
필자가 2016년 3월에 출간한 책인 [Go 언어 웹 프로그래밍 철저 입문](https://thebook.io/006806/) 책에서도 `context` 패키지를 다루지 않았었다.


그래서 이번 글에서는 컨텍스트의 사용법을 소개한다.

## 컨텍스트란?

소프트웨어 공학에서 컨텍스트란 용어는 참 다양하게 사용된다.

- context switching
- bounded context
- context menu
- etc.

전혀 다른 의미 같기도 하고, 또 어떻게 보면 비슷한 뭔가가 있는 것 같기도 하고...  
네이버 사전에서 찾아보면 <u>**맥락**</u>이라고 풀이되어 있다.

<img src="/images/golang-context/dic.png" style="width: 500px;"/>

<!-- ![golang-context-dic](/images/golang-context/dic.png) -->

사전적 뜻을 그대로 가져와 보면, <u>**맥락을 유지하는 통로**</u> 정도로 표현할 수 있고, Go에서의 실제 쓰임새를 봐도 이 의미와 크게 다르지 않다.

## Go에서의 컨텍스트

맥락(=컨텍스트)을 유지하기 위해 Go는 `context.Context` 타입을 제공한다.

컨텍스트를 생성하는 방법은 여러가지가 있는데 기본은 `context.Background` 함수를 사용하여 생성하는 것이다.

{{< highlight go >}}
func Background() Context
{{< /highlight >}}

한번 생성된 컨텍스트는 변경할 수 없다.
그래서 컨텍스트에 값을 추가하고 싶을 때는 `context.WithValue` 함수로 새로운 컨텍스트를 만들어 주어야 한다.

{{< highlight go >}}
func WithValue(parent Context, key, val interface{}) Context
{{< /highlight >}}

컨텍스트의 값을 가져올때는 컨텍스트의 `Value` 메서드를 사용한다.

{{< highlight go >}}
type Context interface {
	Value(key interface{}) interface{}
}
{{< /highlight >}}

`context.WithCancel` 함수로 생성한 컨텍스트에는 취소 신호를 보낼 수 있다.

{{< highlight go >}}
func WithCancel(parent Context) (ctx Context, cancel CancelFunc)
{{< /highlight >}}

일정 시간이 되면 자동으로 컨텍스트에 취소 신호가 전달되도록 하려면 `context.WithDeadline` 함수나 `context.WithTimeout` 함수를 사용하여 컨텍스트를 생성하면 된다.

{{< highlight go >}}
func WithDeadline(parent Context, d time.Time) (Context, CancelFunc)
{{< /highlight >}}
{{< highlight go >}}
func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc)
{{< /highlight >}}

각각의 함수&메서드가 어떻게 동작하는지는 예제와 함께 설명을 하겠다.


## 컨텍스트 내부의 값 사용

컨텍스트를 사용하는 일반적인 패턴은 현재 맥락 안에서 유지해야 할 값을 컨텍스트에 담아서 전달하고, 필요한 곳에서 컨텍스트의 값을 꺼내 사용하는 것이다.

아래 예제에서는 `context.Background` 함수로 컨텍스트를 생성한 후, `context.WithValue` 함수로 기존 컨텍스트에 값을 추가하여 새로운 컨텍스트를 생성하였다.
그리고 다른 함수 호출시 이 컨텍스트(`ctx`)를 파라미터로 전달하였다.

{{< highlight go >}}
// 컨텍스트 생성
ctx := context.Background()

// 컨텍스트에 값 추가
// context.WithValue 함수를 사용하여 새로운 컨텍스트를 생성함
ctx = context.WithValue(ctx, "current_user", currentUser)

// 함수 호출시 컨텍스트를 파라미터로 전달
myFunc(ctx)
{{< /highlight >}}

`myFunc` 함수에서는 파라미터로 전달받은 `ctx`에서 키<sub>*key*</sub>가 `"current_user"`인 값을 꺼내서 사용하였다.

{{< highlight go >}}
func myFunc(ctx context.Context) error {
	var currentUser User

	// 컨텍스트에서 값을 가져옴
	if v := ctx.Value("current_user"); v != nil {
		// 타입 확인(type assertion)
		u, ok := v.(User)
		if !ok {
			return errors.New("Not authorized")
		}
		currentUser = u
	} else {
		return errors.New("Not authorized")
	}

	// currentUser를 사용하여 로직 처리

	return nil
}
{{< /highlight >}}

컨텍스트의 값을 꺼내 사용할때 주의해야 할 점이 있다.  
컨텍스트의 `Value` 메서드의 리턴값은 `interface{}` 타입이고, 컨텍스트에 값이 존재하지 않는 경우 `nil`이 리턴된다.
그래서 컨텍스트에 해당 값이 존재하는지(`v != nil`), 그리고 그 값이 원하는 타입이 맞는지 type assertion을 통해 확인(`u, ok := v.(User)`)을 해야 한다.

## Cancelation

Go에서는 동시에 처리해야 하는 작업을 고루틴으로 실행한다.
고루틴을 사용할 때 주의해야 할 점은 내가 실행한 고루틴이 일정 시간 안에 반드시 종료될 것이란 것을 보장해야 한다는 것이다.
Go 커뮤니티에 막대한 영향력을 행사하고 있는 Dave Cheney도 [자신의 블로그](https://dave.cheney.net/2016/12/22/never-start-a-goroutine-without-knowing-how-it-will-stop)에서 **`Never start a goroutine without knowing how it will stop`**이라고 강조했다.
즉, 고루틴이 언제 종료될지 모른 채로 고루틴을 실행시키지 말라는 것이다.
컨텍스트의 cancelation 기능을 사용하면 고루틴의 생명주기를 쉽게 제어할 수 있다.

`context.WithCancel` 함수로 컨텍스트를 생성하면 두 개의 값이 리턴이 된다.

{{< highlight go >}}
func WithCancel(parent Context) (ctx Context, cancel CancelFunc)
{{< /highlight >}}

- 첫 번째 리턴값 `ctx`는 새로 생성된 컨텍스트이고,
- 두 번째 리턴값 `cancel`은 컨텍스트에 종료 신호를 보낼 수 있는 함수이다.

컨텍스트를 사용하여 고루틴의 생명주기를 제어하기 위해 알아야 하는 두 가지 중요한 메서드가 있다.

{{< highlight go >}}
type Context interface {
	Done() <-chan struct{}
	Err() error
}	
{{< /highlight >}}

컨텍스트의 `Done()` 메서드는 종료 신호를 전달받을 수 있는 채널을 반환한다.
즉, `cancel` 함수를 실행하여 컨텍스트에 종료 신호를 보내면 그 상황을 컨텍스트의 `Done()` 메서드를 통해 알 수 있는 것이다. `Err()` 메서드는 컨텍스트가 강제 종료 되었을 때의 상황을 리턴한다.

예제를 통해 확인해보자.


아래에 오랜 시간 동안 처리되어야 하는 함수가 있다.
{{< highlight go >}}
func longFunc() string {
	<-time.After(time.Second * 3) // long running job
	return "Success"
}
{{< /highlight >}}

아래 `longFuncWithCtx` 함수에서는 고루틴으로 `longFunc` 함수를 실행시켰다.
이때 `select` 구문을 사용하여 `longFunc` 함수의 결과와 컨텍스트 `Done()` 채널의 신호를 기다린다.
`longFunc` 함수가 정상적으로 처리가 완료 되면 처리 결과를 리턴하고
`longFunc` 함수가 끝나기 전 컨텍스트로부터 `Done()` 신호가 전달되면 에러를 리턴한다.

{{< highlight go >}}
func longFuncWithCtx(ctx context.Context) (string, error) {
	done := make(chan string)

	go func() {
		done <- longFunc()
	}()

	select {
	case result := <-done:
		return result, nil
	case <-ctx.Done():
		return "Fail", ctx.Err()
	}
}
{{< /highlight >}}

아래는 위 함수(`longFuncWithCtx`)를 구동하는 코드이다.
`context.WithCancel` 함수로 컨텍스트를 생성했고
고루틴을 종료해야 할 상황이 되면 `cancel` 함수를 실행하여 컨텍스트에 취소 신호를 전달한다. 이와 같은 방식으로 고루틴이 안정적으로 종료되도록 하였다.

{{< highlight go >}}
ctx, cancel := context.WithCancel(context.Background())

go func() {
	// 고루틴을 종료해야 할 상황이 되면 cancel 함수 실행
	cancel()
}()

result, err := longFuncWithCtx(ctx)
{{< /highlight >}}

고루틴의 생명주기를 제어하기 어려운 경우는 동시에 여러개의 고루틴을 실행하는 경우이다.
실행되는 고루틴의 로직은 같다 하더라도 실제 런타임의 상황에 따라 각각의 고루틴은 다르게 동작할 수도 있다.
예를 들면 특정 고루틴은 시스템 자원 할당을 기다리다가 무한정 대기 상태에 빠질 수도 있고 무한루프에서 빠져나오지 못하는 경우가 있을 수도 있다.
dead lock이나 race condition 같은 치명적인 상태에 빠질 수도 있다.
<font color=grey><small>*(물론 이런 상황이 발생하지 않도록 코드를 잘 짜야 하겠지만, 그럼에도 불구하고 방어적인 프로그래밍(Defensive programming)은 중요하다. 고전으로 불리는 코드 컴플리트(Code Complete) 책에서도 한 장을 할애해서 방어적인 프로그래밍의 중요성을 강조하고 있다)*</small></font>
이런 상황에 빠지더라도 특정 시점이 되면 고루틴이 종료되도록 고루틴의 생명주기를 제어할 수 있어야 한다.

여러 고루틴이 컨텍스트를 공유하도록 하면, 하나의 컨텍스트로 여러 고루틴의 생명주기를 한꺼번에 제어할 수 있다.
아래 코드에서 `cancel` 함수로 컨텍스트(`ctx`)에 취소 신호를 보내면, `ctx`를 사용하는 모든 고루틴에 동일하게 취소 신호가 전달된다. 여러 고루틴에 일일이 취소 신호를 전달하지 않아도 된다.
{{< highlight go >}}
ctx, cancel := context.WithCancel(context.Background())

go func() {
	// 고루틴을 종료해야 할 상황이 되면 cancel 함수 실행
	cancel()
}()

// jobCount 만큼 여러개의 고루틴을 만들어 longFuncWithCtx 수행
var wg sync.WaitGroup
for i := 0; i < jobCount; i++ {
	wg.Add(1)

	go func() {
		defer wg.Done()
		result, err := longFuncWithCtx(ctx)		
		if err != nil {
			//
		}
	}()
}
wg.Wait()
{{< /highlight >}}

## Timeout & Deadline

이번에 소개할 방식은 일정 시간이 되면 컨텍스트에 자동으로 취소 신호가 전달되도록 하는 방식이다.
Cancelation과 전체적인 동작 방식은 비슷하다.

`context.WithDeadline` 함수는 두 번째 파라미터로 `time.Time` 값을 받는데, 이 시간이 되면 컨텍스트에 취소 신호가 전달된다

{{< highlight go >}}
func WithDeadline(parent Context, d time.Time) (Context, CancelFunc)
{{< /highlight >}}

`context.WithTimeout` 함수도 동작 방식은 같다.
한 가지 차이점은 두번째 파라미터로 `time.Duration` 값을 받는다는 것이다.
두 번째 파라미터로 전달한 duration이 지나면 컨텍스트에 취소 신호가 전달된다.


{{< highlight go >}}
func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc)
{{< /highlight >}}

컨텍스트의 `Deadline` 메서드를 사용하면 컨텍스트로 취소 신호가 전달될 때까지 남은 시간을 확인할 수 있다.
작업을 시작하기 전 남은 시간을 먼저 확인을 해서, 충분한 시간이 있을 때만 작업을 수행하도록 할 수 있다.

{{< highlight go >}}
type Context interface {
	Deadline() (deadline time.Time, ok bool)
}
{{< /highlight >}}

필자는 `context.WithTimeout` 함수를 많이 사용한다.
주로 네트워크 병목이 생기는 작업을 고루틴으로 실행하는 경우가 많은데, 간혹 네트워크 문제로 timeout이 발생하는 경우가 있다.
이런 경우 고루틴 안으로 `context.WithTimeout` 함수로 생성한 컨텍스트를 전달하여 일정한 시간이 지나면 고루틴을 자동으로 종료하도록 해서 고루틴이 무한정 길어지는 것을 막을 수 있다.

{{< highlight go >}}
ctx, cancel := context.WithTimeout(context.Background(), maxDuration)

go func() {
	// 고루틴을 종료해야 할 상황이 되면 cancel 함수 실행
	cancel()
}()

start := time.Now()
result, err := longFuncWithCtx(ctx)
fmt.Printf("duration:%v result:%s\n", time.Since(start), result)
{{< /highlight >}}

## 컨텍스트의 활용 예: `http.Request`

Go의 기본 라이브러리에서 컨텍스트가 어떻게 사용되고 있는지 살펴보자.

`http.Request`는 컨텍스트 활용의 아주 좋은 예다.
웹 어플리케이션에서 사용자의 요청이 들어왔을 때, 요청한 작업을 수행한 후에 클라이언트로 response를 전달할 때까지를 하나의 맥락이라 볼 수 있다.
이 맥락 안에서 유지되어야 할 값들이 있다면 그것을 컨텍스트에 담아두고 필요한 곳에서 사용하면 된다.

`http.Request` 타입은 아래와 같이 정의되어 있다.

{{< highlight go >}}
package http

type Request struct {
	Method string	
	Header Header
	Body io.ReadCloser		

	/* ... */

	ctx context.Context
}
{{< /highlight >}}

맨 마지막 필드로 `ctx context.Context`가 정의되어 있다.
이 컨텍스트에 웹 요청이 완료될 때까지 유지해야 하는 값을 보관한다.

웹 서버에서 요청이 들어오면 `http.Request` 값을 만들어 핸들러 함수로 전달하는데 이때 컨텍스트를 생성한다.
`http.Request`의 `Context` 함수를 사용하면 이 컨텍스트를 가져올 수 있다.

{{< highlight go >}}
package http

func (r *Request) Context() context.Context
{{< /highlight >}}


이 컨텍스트에 하나의 웹 요청이 처리되는 동안 유지해야 할 값을 담아놓고 필요한 곳에서 사용하면 된다.
주로 미들웨어에서 요청 상태를 확인해서 `http.Request`의 컨텍스트에 필요한 값을 담아서 다음 핸들러로 전달한다.


아래는 웹 요청을 처리하는 핸들러 함수이다.
`http.Request`의 컨텍스트로 부터 `"current_user"` 값을 가져와서 사용한다.

{{< highlight go >}}
func handler(w http.ResponseWriter, r *http.Request) {
	var currentUser User

	// 컨텍스트에서 값을 가져옴
	if v := r.Context().Value("current_user"); v == nil {
		// "current_user"가 존재하지 않으면 401 에러 리턴
		http.Error(w, "Not Authorized", http.StatusUnauthorized)
		return
	} else {
		u, ok := v.(User)
		if !ok {
			// 타입이 User가 아니면 401 에러 리턴
			http.Error(w, "Not Authorized", http.StatusUnauthorized)
			return
		}

		currentUser = u
	}

	fmt.Fprintf(w, "Hi I am %s", currentUser.Name)
}
{{< /highlight >}}

아래는 미들웨어 함수이다.

{{< highlight go >}}
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. 사용자의 현재 세션 정보를 기반으로 currentUser 생성
		currentUser, err := getCurrentUser(r)
		if err != nil {
			http.Error(w, "Not Authorized", http.StatusUnauthorized)
			return
		}

		// 2. 기본 컨텍스트에 current_user를 담아 새로운 컨텍스트 생성
		ctx := context.WithValue(r.Context(), "current_user", currentUser)

		// 3. 새로 생성한 컨텍스트 할당한 새로운 `http.Request` 생성
		nextRequest := r.WithContext(ctx)

		// 4. 다음 핸들러 호출
		next(w, nextRequest)
	}
}
{{< /highlight >}}

1. 사용자의 현재 세션 정보를 기반으로 `currentUser`를 생성하여
2. `http.Request`의 컨텍스트에 `currentUser`를 담아 새로운 컨텍스트를 생성하였다.
3. 그리고 새로 생성한 컨텍스트 할당한 새로운 `http.Request`를 생성하여
4. 다음 핸들러를 호출하게 하였다.


메인 함수에서 웹서버를 구동하였다.
이때 핸들러에 `authMiddleware`를 적용하였다.

{{< highlight go >}}
func main() {
	http.HandleFunc("/", authMiddleware(handler))
	log.Fatal(http.ListenAndServe(":8080", nil))
}
{{< /highlight >}}

---

이 글에서 소개된 예제는 github에서 확인할 수 있다.

https://github.com/jaehue/golang-ctx-example.git

<!-- ## 사족

이 글의 서두에서도 말했지만 Go에는 다른 대중적인 언어와 다른 개념들이 좀 있어서 *Go스럽게(?)* 코드를 작성하는 것이 어려울 수 있다.
그래서 이전에 사용했던 언어의 방식을 그대로 Go로 가지고 와서 작성하는 경우도 많이 봐 왔다.
이런 코드를 보면 문법은 분명 Go 언어인데 로직의 전개 방식은 굉장히 어색했다.
그리고 그런 코드는 실제 런타임에서도 문제를 일으키게 된다.
그러다 보면 "Go 언어는 왜이래?"라는 불만을 남기기도 하고 자연스레 Go 언어와 멀어진다.
문제를 해결하는 Go언어의 방식이 있는데, 그 방식에 충분히 젖어들기 전에 나만의 방법대로 코드를 작성해가면 불편함을 많이 느끼게 된다.

Go 언어를 처음 사용할때는 Go에서 가이드하는 방식을 최대한 그대로 따라해보는 것을 권장한다.
Go 언어에 많이 익숙해져서 언어의 기능을 충분히 잘 활용할 수 있는 수준이 되면 그때의 상황에 맞게 효율적으로 나만의 방식대로 코드를 작성
 -->