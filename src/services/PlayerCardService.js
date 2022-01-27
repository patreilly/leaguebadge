import fetch from 'auth/FetchInterceptor'

const playerCardService = {}

playerCardService.getPlayer = function (params) {
  return fetch({
    url: '/player/{playerid}',
    method: 'get',
    params
  })
}


playerCardService.setPost = function (data) {
  return fetch({
    url: '/posts',
    method: 'post',
    data: data
  })
}

export default playerCardService