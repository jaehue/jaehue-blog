---
title: "Go My Way #2 - 데이터베이스, 로깅"
draft: false
date: "2017-06-14T00:00:00+08:00"
categories:
  - IT
tags:
  - golang
---

**Go My Way**는 Go 언어로 웹 어플리케이션을 작성할 때 선호하는 나만의 방식을 3편에 걸쳐서 소개하는 글이다.
이전 글은 읽지 않았다면 아래 링크를 참조하기 바란다.


- [Go My Way #1 - 웹 프레임워크](/post/go-my-way-1-webframework/)
- Go My Way #2 - 데이터베이스, 로깅
- [Go My Way #3 - Configuration, Tracing, etc.](/post/go-my-way-3-tracing/)
- 번외 - gomobile

이번 글에서는 `데이터베이스`와 `로깅`에 대해 소개하겠다.

# 데이터베이스

다른 언어에서 주로 사용하던 ORM(루비의 active record, 닷넷의 entityframework, 자바의 JPA, 등)을 생각한다면 Go의 DB 관련 패키지들은 대부분 ~~2%~~ 20% 이상 부족하다.
대신 Go 진영에서는 ORM에 대해 회의적인 이야기가 종종 나온다.
"_Go의 ORM 툴 중에서 어떤 게 좋은가?_" 라는 질문<small>([Golang which ORM is better](https://www.reddit.com/r/golang/comments/3ajqa6/golang_which_orm_is_better/))</small>에, 그냥 가벼운 query mapper 정도의 기능으로 충분하다는 의견이 대부분이고,
자신은 네이티브 쿼리를 직접 사용하는 것을 선호한다는 의견을 피력한 글<small>([Our Go is fine but our SQL is great](https://medium.com/bumpers/our-go-is-fine-but-our-sql-is-great-b4857950a243))</small>도 있다.

Go 진영의 전반적인 분위기로는 Active Record나 Hibernate와 같은 똑똑한 ORM은 등장하지 않을 것으로 보인다.

나도 이전에는 DB 접근 시에는 당연히 ORM을 사용해야 한다는 생각을 하고 있었고, 또 네이티브 쿼리를 쓰는 것보다 ORM에서 제공하는 추상화된 DSL을 사용하는 것이 더 똑똑한 방법이라는 근거 없는 생각이 자리 잡고 있었다.
왜 그렇게 생각했었을까?
모든 코드는 객체지향스럽게 작성해야 한다는 강박관념이 있었고, 그래서 2차원적으로 테이블을 다루는 쿼리문은 웬지 수준이 낮다고 생각했었나보다.

모델링을 하는 것과 실제 DB를 처리하는 방식은 별개로 생각해야 한다.
모델을 잘 정의하고 모델 기반으로 전체 프로그램이 동작하도록 한다면 DB 처리 방식은 그렇게 중요하지 않을 수 있다. 네이티브 쿼리를 쓰든, ORM을 쓰든, 적당히 썩어 쓰든, 그 안에서 최적의 방식을 찾아가는게 맞다고 본다.
Go를 계속해서 사용하다 보니 이론보다는 실용성 관점으로 문제에 접근하게 되었고(그것이 바로 Go의 철학)
ORM에 대한 Go 진영의 이런 의견에 어느 정도 동의가 되었다.
<small>(동의 안 하면 어쩔..? 직접 만들 능력은 안 되고, 나를 적응시켜야지 ㅋ)</small>

허접스러운 Go의 ORM 도구에 대한 변명은 이 정도로 하고,

## xorm

그래서 내가 선택한 것은 [xorm](http://xorm.io/)이다.
[gorm](https://github.com/jinzhu/gorm)을 오랫동안 써 오다가
xorm의 한가지 기능이 마음에 들어 xorm으로 갈아탔다.
xorm은 필드의 타입이 built-in 타입이 아니라면(slice, map, custom type) JSON 문자열로 변환해준다.

예를들면,
{{< highlight go >}}
type Product struct {
	Id     int64
	Images map[string]Image
}
type Image struct {
	URL    string
	Width  int32
	Height int32
}
{{< /highlight >}}
위와 같이 `Product`에 Images 필드의 타입을 `map[string]Image`로 정의하면, xorm은 DB 테이블에 `images` 필드를 `text` 타입으로 만들고, `map[string]Image`를 JSON 문자열로 저장한다.
DB에서 데이터를 읽을때도 마찬가지, JSON 문자열을 `map[string]Image` 타입으로 변환해준다.
당연히, 실제 DB 필드와의 매핑 룰을 재정의 할 수도 있다. 아래의 [`Conversion` interface](https://github.com/go-xorm/core/blob/master/converstion.go#L5)에 정의된 메쏘드를 구현하면 된다.
{{< highlight go >}}
// https://github.com/go-xorm/core/blob/master/converstion.go#L5
type Conversion interface {
    FromDB([]byte) error
    ToDB() ([]byte, error)
}
{{< /highlight >}}

우리 회사의 비즈니스는 유동적이라서 모델의 형태를 확정하기 어려운 경우가 많다.
그런 유동적인 데이터는 필드의 타입을 확정하지 않고 그냥 JSON으로 변환하여 하나의 필드에 저장한다.
xorm을 쓰기 이 전에는,
위에서 예로 든 `Images`를 저장하기 위해 JSON 문자열 저장용 필드인 `ImagesRaw` 필드를 `string` 타입으로 만들고 DB에는 `ImagesRaw` 필드만 저장한다. `Product`에 대해 CRU<small>(Create/Read/Update)</small> 작업을 할때마다 JSON 변환 작업을 해 주어야 한다.
여간 귀찮은 일이 아니었다.
xorm에는 이 기능이 내장되어 있어서 아주 편리하다.

## 다른 DB 도구와의 비교

[awesome-go 페이지](https://github.com/avelino/awesome-go#database)에 보면 정말 많은 DB 관련 패키지가 있다. (web framework 만큼이나 많다)
그중에서 내가 직접 사용해 본 것들만 간단하게 소개해 본다.

> 참고로, [awesome-go](https://github.com/avelino/awesome-go)에 등록된 패키지는 믿고 써도 될 것 같다.
무작정 awesome-go에 등록해주는 것이 아니라, 내부적인 [검열(?) 기준](https://github.com/avelino/awesome-go/blob/master/CONTRIBUTING.md#quality-standards)이 있다.
말뿐인 기준이 아니라, 실제 이 기준에 맞게 등록을 거부하기도 하고, 이미 등록된 것이라 할지라도 기준에 부합하지 않는다면 제거하기도 한다.
그 예로, [Remove iris from listing #1135](https://github.com/avelino/awesome-go/pull/1135)에서 [iris](https://github.com/kataras/iris)를 제거하였고,
이후 iris 메인 커미터가 awesome-go에 재등록 요청을 했지만([Re-add Iris #1137](https://github.com/avelino/awesome-go/pull/1137)) 또다시 거부당했다.
이런 사례를 보면 꽤 엄격하게 퀄리티를 관리하는 것 같다.



## [gorp](https://github.com/go-gorp/gorp)
쿼리 실행 결과를 struct에 바인딩해준다.
`an ORM-ish library for Go`라고 소개하고 있지만, ORM은 아니 것 같음.
단순한 query mapper.
한국 개발자들에게 익숙한 ibatis와 유사하다

## [sqlx](https://github.com/jmoiron/sqlx)
단순한 query mapper. gorp와 유사하다.
gorp에 비해 sqlx가 좀 더 활동이 활발하고 사용하는데도 많은 것 같다.
단순히 쿼리 결과를 struct에 받아오고 싶다면 sqlx를 추천한다.

## [gorm](https://github.com/jinzhu/gorm)
struct를 기반으로 CRUD 기능을 제공한다. (기본적인 ORM 기능)
모델 간 Associations<small>*(belongs-to, has-one, has-many, many-to-many, polymorphism)*</small>를 정의할 수 있다.
하지만 실제 사용해보면 불편한 부분이 많다. 연관된 모델을 알아서(?) 가져오지 않는다.
{{< highlight go >}}
type User struct {
        ID       int64
        Emails   []Email
}
type Email struct {
        ID      int64
        UserID  int64
}
{{< /highlight >}}
위와 같이 has-many 관계로 모델을 정의했을때, `User`의 `Emails`를 가져오려면, 아래와 같이 추가 코드를 작성해야 한다.
{{< highlight go >}}
db.Model(&user).Related(&emails)
{{< /highlight >}}
직접 써보면, gorm이 제공하는 Associations 기능이 큰 도움이 안된다.

like 수는 gorm이 제일 많다.

## [xorm](http://xorm.io/)
struct를 기반으로 CRUD 기능을 제공한다(기본적인 ORM 기능).
gorm과 유사하다.
모델 간 Associations을 정의하는 기능은 없다.
캐싱 기능을 제공한다.
built-in 타입이 아닌 필드는 JSON으로 변환해 준다.


## [squirrel](https://github.com/Masterminds/squirrel)
가벼운 query builder. Go 코드로 쿼리를 생성한다.
이런 느낌이다.
{{< highlight go >}}
sql, args, err := sq.
        Select("*").
        From("users").
        Join("emails USING (email_id)").
        Where(sq.Eq{"deleted_at": nil}).
        ToSql()
// SELECT * FROM users JOIN emails USING (email_id) WHERE deleted_at IS NULL
{{< /highlight >}}
{{< highlight go >}}
sql, args, err := sq.
        Insert("users").Columns("name", "age").
        Values("moe", 13).Values("larry", sq.Expr("? + 5", 12)).
        ToSql()
// INSERT INTO users (name,age) VALUES (?,?),(?,? + 5)
{{< /highlight >}}
하지만 이렇게 만들어진 쿼리를 실행하려면, `database/sql` 패키지를 직접 사용해서 쿼리를 실행하고 결과를 받아와야 한다.
squirrel과 sqlx를 함께 쓰는 것도 좋은 방법이다.(굳이 그렇게 쓸 거면 차라리 딴 거를...)

## 활용

데이터베이스 처리를 위한 패키지를 선택했다면, 실제 어플리케이션에서 DB 객체를 사용하는 방법에 대해서도 다양한 케이스가 있다.
며칠 전 페이스북 Golang Korea 그룹에도 [DB 객체 관리에 대한 질문](https://www.facebook.com/groups/golangko/permalink/772578392919642/)이 올라왔었고, 많은 분이 좋은 답변을 주셨다.

나는 웹 어플리케이션을 작성할 때,
`main`에서 DB 객체를 만들고,
미들웨어를 통해 request마다 DB 세션을 만들어 request 내부의 `context`로 전달한다.
이렇게 하는 이유는 트랜잭션 관리 때문이다.
핸들러에서 트랜잭션 처리를 매번 해 주는 불편함을 없애기 위해, 트랜잭션 처리 코드를 미들웨어로 옮겼다.

{{< highlight go >}}
main(){
        /* ... */
	db, err := xorm.NewEngine(driver, connection)
	if err != nil {
		panic(err)
	}
	defer db.Close()

        e := echo.New()
        e.Use(dbContext(db))
        /* ... */
}

func dbContext(db *xorm.Engine) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			session := db.NewSession()
			defer session.Close()

			req := c.Request()
			c.SetRequest(req.WithContext(
				context.WithValue(
					req.Context(),
					"DB",
					session,
				),
			))

			switch req.Method {
			case "POST", "PUT", "DELETE":
				if err := session.Begin(); err != nil {
					return echo.NewHTTPError(500, err.Error())
				}
				if err := next(c); err != nil {
					session.Rollback()
					return echo.NewHTTPError(500, err.Error())
				}
				if c.Response().Status >= 500 {
					session.Rollback()
					return nil
				}
				if err := session.Commit(); err != nil {
					return echo.NewHTTPError(500, err.Error())
				}
			default:
				if err := next(c); err != nil {
					return echo.NewHTTPError(500, err.Error())
				}
			}

			return nil
		}
	}
}
{{< /highlight >}}
database connection의 스코프는 global 이지만, 트랜잭션 처리를 위해 request마다 세션을 만드는 경우 database session의 스코프는 request 단위가 된다.
이런 경우는 request scoped 단위로 관리되는 Context에 보관하는 것이 바르다고 생각한다.
DB에 접근할때는 Context에서 DB 세션을 가져와서 사용한다.
{{< highlight go >}}
func (Model) GetById(ctx context.Context, id int64) (*Model, error) {
	db := ctx.Value("DB").(*xorm.Session)
	var v Model
	if has, err := db.ID(id).Get(&v); err != nil {
		return nil, err
	} else if !has {
		return nil, nil
	}
	return &v, nil
}
func (d *Model) Update(ctx context.Context) (err error) {
	db := ctx.Value("DB").(*xorm.Session)
	_, err = db.ID(d.Id).Update(d)
	return
}
{{< /highlight >}}
하지만 트랜잭션을 관리할 필요가 없고, 경계가 명확한 모듈 내에서라면 DB 객체를 전역으로 만들어 쓰는 방식도 나쁘지 않다고 본다.

이 방식은 [1편](/post/go-my-way-1/)에서 소개한 [echosample](https://github.com/pangpanglabs/echosample) 프로젝트에도 적용되어 있다.

# Logging

Logging 얘기를 시작하기 전에, 또 Go의 허접스러운 `log` 패키지에 대해 변명을 좀 해야겠다. ㅋ

Go에는 `log` 패키지가 기본으로 제공되는데, 로그 문자열을 `io.Writer`에 출력해주는 기능밖에 없다.
대부분의 로그 라이브러리에서 사용하는 방식인 로그 레벨을 지정할 수도 없다.
Go의 이러한 로깅 방식에 대한 [Dave Chaney의 글](https://dave.cheney.net/2015/11/05/lets-talk-about-logging)은 지금까지 고민하지 않고 당연하게 써 오던 로그 방식에 대해 다시 한번 생각해보게 했다.

`warning`이라게 대체 뭘까? 에러도 아니고 에러가 아닌 것도 아니고, 나중에 에러가 될 것 같다는 건가? 솔직히 로그 출력 레벨을 `info`나 `error`로 해 놓지, `warning`으로 해 놓는 경우는 거의 없지 않나? (뭐 있을 수도 있고.) 지금까지의 운영 경험을 되돌아보면 `warning`과 `info`의 구분이 좀 모호했다.

`fatal` 레벨은 또 뭐지? Go의 기본 `log` 패키지에서 `log.Fatal()`은 로그를 출력함과 동시에 프로그램을 종료한다. 대부분의 leveled logging 패키지도 비슷하게 동작한다.
그럴 거면 그냥 `log.Fatal()`을 쓰면 되지, 굳이 leveled logging 방식을 사용할 필요가 있나?

`error` 레벨에 대해서도 생각해보자. `error` 레벨로 로그를 남길 때는 에러값이 발생했을 때 에러를 처리하기 전 `error` 레벨로 로그를 남긴다. 하지만, 에러를 처리했다면 이제 그건 더이상 에러가 아니다. 그건 그냥 단순한 `info`일 뿐이다. 흠... `error`와 `info`가 같아져 버렸네.

로그는 그냥 information을 출력하는 것. 단지 그것뿐이다.
최소한의 기능으로 로그 패키지를 만든다면, Go에서 기본으로 제공되는 `log` 패키지와 같은 모습이지 않을까?

하지만 실제로는 기본 `log` 패키지 대신, 많은 level-based-logging 패키지가 쓰이고 있다. (나도 마찬가지 ㅋ)

## logrus

난 [logrus](https://github.com/sirupsen/logrus)를 사용한다.
써보면 제일 편하다.
logrus로 오기까지도 꽤 긴 여정이 있었다.

사실 가장 먼저 사용했던 로그도 logrus였다.
하지만 [zap](https://github.com/uber-go/zap)의 [성능 자랑질(?)](https://github.com/uber-go/zap#performance)에 넘어가서 한동안 zap을 사용했었다.
성능은 좋을지 몰라도, 사용하긴 좀 불편했다.
zap은 로그 값을 넘길때 반드시 타입을 명시적으로 지정해 주어야 한다.
{{< highlight go >}}
logger.Info("Failed to fetch URL.",
	zap.String("url", url),
	zap.Int("attempt", 3),
	zap.Duration("backoff", time.Second),
)
{{< /highlight >}}
저게 여간 귀찮은 일이 아니다.
struct 값 전체를 로그로 남기고 싶은데, 각 필드를 일일이 저렇게 타입별로 넣어주어야 한다.
물론 성능을 생각하면 저렇게 하는게 맞지만, 꼭 서비스 운영 상황이 아니더라도,
개발중에 가볍게 로그를 남겨볼 수도 있고, 운영서비스에도 임시로 로그를 넣었다 빼는 경우도 많다.
그럴땐 그냥 값을 통째로 남기는게 편하지, 저렇게 일일이 필드와 타입을 적는 것은 너무 귀찮은 일이다. (게다가 built-in 타입만 사용할 수 있다.)

logrus는 지정한 Formatter(JsonFormatter, TextFormatter, Custom Formater)를 사용해 어떤 값이든 로그를 남겨준다.
TextFormatter를 사용하면 `fmt.Print` 처럼 기본 출력 포맷으로 로그를 남겨준다.
게다가 <small>로그 모양도 예쁘고*(로그가 예뻐야 개발 생산성이 좋아진다?)*</small> 로그 액션마다 Hook을 넣을수도 있다.
이미 누군가가 [괜찮은 Hook들](https://github.com/sirupsen/logrus#hooks)을 많이 만들어 놓았다.

우리는 카프카를 거쳐 Hadoop으로 모든 로그를 전송하고,
그리고 필요한 경우 [presto](https://prestodb.io/)를 이용해 Haddop에 있는 로그를 조회한다.
이렇게 로그에 추가 액션을 넣고 싶을때 logrus의 Hook 기능을 사용하면 편리하다.

[go-kit log](https://github.com/go-kit/kit/tree/master/log)도 편하긴 한데, go-kit log 역시 built-in 타입만 사용할 수 있다는 점이 불편했다.
하지만
logrus의 많은 기능을 활용할 것이 아니라면, 그리고 성능에 많이 신경을 써야 하는 서비스라면 [zap](https://github.com/uber-go/zap)과 같은 가벼운 logger를 사용하는 것이 나을 수도 있겠다.


## 활용

실제 운영 상황에서 여러 request가 동시에 쏟아지는 경우, 로그에 timestamp만 남기면 하나의 request가 어떤 과정으로 처리되는지 추적하기가 어렵다.
각 요청마다 request_id를 할당하고 그것을 함께 로그로 남기면 여러 request에 대한 로그가 뒤섞여 있어도, 하나의 request가 처리되면서 남기는 로그를 추적할 수 있다.
그래서 각 request마다 고유 request_id가 부여된 log 객체를 만들어 context로 전달했다.

{{< highlight go >}}
func main() {
	e := echo.New()

	// 각 request마다 고유의 ID를 부여
	e.Use(middleware.RequestID())
	e.Use(Logger())

        /* ... */

}

func Logger() echo.MiddlewareFunc {
	logger := logrus.New()
        /* ... logger 초기화 */
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			logEntry := logrus.NewEntry(logger)

			// request_id를 가져와 logEntry에 셋팅
			id := c.Request().Header.Get(echo.HeaderXRequestID)
			if id == "" {
				id = c.Response().Header().Get(echo.HeaderXRequestID)
			}
                        logEntry = logEntry.WithField("request_id", id)

			// logEntry를 Context에 저장
			req := c.Request()
			c.SetRequest(req.WithContext(
				context.WithValue(
					req.Context(),
					"LOG",
					logEntry,
				),
			))

			return next(c)
		}
	}
}
{{< /highlight >}}
echo app에 `middleware.RequestID()` 미들웨어를 추가하면 각 request마다 고유의 ID를 부여한다.
이렇게 생성된 `request_id`를 `logEntry`에 추가한 상태로 Context 보관한다.
로그를 사용할때는 Context에서 로그 객체를 가져와서 사용한다.
{{< highlight go >}}
logger := ctx.Value("LOG").(*logrus.Entry)
logger.WithFields(logrus.Fields{
	"url":     url,
	"attempt": 3,
	"backoff": time.Second,
}).Info("Failed to fetch URL.")
{{< /highlight >}}

이렇게 로그를 남기면, `url`, `attempt`, `backoff` 값과 함께 미들웨어에서 추가한 `request_id`도 함께 출력이 된다.

---

***이번 포스트에서 다룬 주제인 데이터베이스와 로깅은 구현 방법이 정말 다양한 것 같습니다.
더 좋은 방안에 대해 함께 논의해보면 좋겠습니다.
주저하지 말고 의견 주세요 ^^***