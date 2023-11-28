package checkusername

type ICheckUsernameService interface {
	CheckUsername(input *CheckUsernameInput) bool
}

type CheckUsernameService struct {
	repo ICheckUsername
}

func NewCheckUsernameService(repo ICheckUsername) *CheckUsernameService {
	return &CheckUsernameService{
		repo: repo,
	}
}

func (service *CheckUsernameService) CheckUsername(input *CheckUsernameInput) bool {
	return service.repo.CheckUsername(input)
}
