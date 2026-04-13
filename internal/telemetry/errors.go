package telemetry

type ServerError struct {
	Message    string
	ErrorCode  int
	HTTPStatus int
}

func (e *ServerError) Error() string {
	return e.Message
}

const (
	ErrorCodeHiveIDMissing      = 4001
	ErrorCodeFieldsMissing      = 4002
	ErrorCodeInvalidTimeRange   = 4003
	ErrorCodeBoxIDMissing       = 4004
	ErrorCodePositiveValuesOnly = 4005
	ErrorCodeInvalidInput       = 4006
	ErrorCodeInternal           = 5000
)
